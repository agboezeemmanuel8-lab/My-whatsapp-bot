import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const sock = makeWASocket({ auth: state, printQRInTerminal: false })
  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {
    const number = '2347054257462'
     const code = await sock.requestPairingCode(number)
    console.log('PAIRING CODE:', code)
  }

  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open') console.log('Connected!')
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) start()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
    if (text.trim() === '/groupinfo') {
      const jid = m.key.remoteJid
      const meta = await sock.groupMetadata(jid)
      const admins = meta.participants.filter(p => p.admin).length
      await sock.sendMessage(jid, { text: `*GROUP INFO*\nTitle: ${meta.subject}\nId: ${meta.id}\nOwner: ${meta.owner}\nMembers: ${meta.participants.length}\nAdmins: ${admins}\nDesc: ${meta.desc || 'No description'}` }, { quoted: m })
    }
  })
}
start()
