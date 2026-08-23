export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: { name: string; value: string }[];
    body: { size: number; data?: string };
    parts?: any[];
  };
  internalDate: string;
}

export async function fetchRecentEmails(
  accessToken: string,
  maxResults = 15,
): Promise<GmailMessage[]> {
  // First, get the list of message IDs
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=INBOX`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!listRes.ok) {
    throw new Error('Failed to fetch Gmail messages list.');
  }

  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  // Fetch full details for each message (could be optimized with batch requests, but doing it in parallel here)
  const detailPromises = messages.map(async (msg) => {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!detailRes.ok) return null;
    return detailRes.json() as Promise<GmailMessage>;
  });

  const detailedMessages = await Promise.all(detailPromises);
  return detailedMessages.filter((m): m is GmailMessage => m !== null);
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyText: string,
): Promise<void> {
  const emailLines = [];
  emailLines.push(`To: ${to}`);
  emailLines.push(`Subject: ${subject}`);
  emailLines.push('Content-Type: text/plain; charset="UTF-8"');
  emailLines.push('');
  emailLines.push(bodyText);

  const email = emailLines.join('\r\n');
  const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64EncodedEmail,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to send email.');
  }
}

export async function fetchUnreadEmails(
  accessToken: string,
  maxResults = 3,
): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:unread in:inbox`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!listRes.ok) {
    throw new Error('Failed to fetch unread Gmail messages list.');
  }

  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  const detailPromises = messages.map(async (msg) => {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!detailRes.ok) return null;
    return detailRes.json() as Promise<GmailMessage>;
  });

  const detailedMessages = await Promise.all(detailPromises);
  return detailedMessages.filter((m): m is GmailMessage => m !== null);
}
