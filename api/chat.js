// /api/chat.js — Vercel Edge Function (no build needed)
export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Call OpenAI (simple, non-streaming)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Compliance Companion, a concise, accurate assistant for financial communications. ' +
              'Provide practical, compliant guidance (FINRA Rule 2210 tone). When uncertain, say so.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: 'Upstream error', details: err }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }

    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? '(no response)';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', details: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
