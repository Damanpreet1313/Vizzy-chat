import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/lib/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const { id } = evt.data
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address
    const name = `${first_name || ''} ${last_name || ''}`.trim()

    try {
      await prisma.user.create({
        data: {
          id: id as string,
          email: email,
          name: name,
        },
      })
      console.log(`User ${id} created in DB`)
    } catch (error) {
      console.error('Error creating user in DB:', error)
      return new Response('Error creating user', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
      const { email_addresses, first_name, last_name } = evt.data
      const email = email_addresses[0]?.email_address
      const name = `${first_name || ''} ${last_name || ''}`.trim()
  
      try {
        await prisma.user.update({
          where: { id: id as string },
          data: {
            email: email,
            name: name,
          },
        })
        console.log(`User ${id} updated in DB`)
      } catch (error) {
        console.error('Error updating user in DB:', error)
        return new Response('Error updating user', { status: 500 })
      }
    }

    if (eventType === 'user.deleted') {
      try {
        await prisma.user.delete({
          where: { id: id as string },
        })
        console.log(`User ${id} deleted in DB`)
      } catch (error) {
        console.error('Error deleting user in DB:', error)
        return new Response('Error deleting user', { status: 500 })
      }
    }

  return new Response('', { status: 200 })
}
