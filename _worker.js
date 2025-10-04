// Emergency worker to fix 404 - minimal response
export default {
  async fetch(request, env, ctx) {
    // Return a minimal HTML response to verify the worker is running
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>mstprmpt.zeidgeist.com - Maintenance</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            h1 { color: #333; }
            p { color: #666; line-height: 1.6; }
            .status { background: #fff3cd; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <h1>Site Under Maintenance</h1>
          <div class="status">
            <p><strong>Status:</strong> We're currently resolving a deployment issue.</p>
            <p>The prompt engineering service will be back online shortly.</p>
          </div>
          <p>Thank you for your patience. If you need immediate assistance, please check back in a few minutes.</p>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}