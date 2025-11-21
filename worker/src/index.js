// Cloudflare Worker for AI Processing with Phi-2

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/grade' && request.method === 'POST') {
        return await handleGrading(request, env);
      } else if (path === '/generate' && request.method === 'POST') {
        return await handleGeneration(request, env);
      } else if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

async function handleGrading(request, env) {
  const { prompt, model = '@cf/microsoft/phi-2' } = await request.json();

  if (!prompt) {
    return jsonResponse({ error: 'Prompt is required' }, 400);
  }

  // Run AI model
  const response = await env.AI.run(model, {
    messages: [
      {
        role: 'system',
        content: 'You are an experienced educator providing fair and constructive grading.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 512,
    temperature: 0.4,
  });

  const aiResponse = response.response || '';

  return jsonResponse({
    success: true,
    response: aiResponse,
    model: model
  }, 200, true);
}

async function handleGeneration(request, env) {
  const { prompt, model = '@cf/microsoft/phi-2' } = await request.json();

  if (!prompt) {
    return jsonResponse({ error: 'Prompt is required' }, 400);
  }

  // Run AI model for content generation
  const response = await env.AI.run(model, {
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant for creating educational content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const aiResponse = response.response || '';

  return jsonResponse({
    success: true,
    response: aiResponse,
    model: model
  }, 200, true);
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function jsonResponse(data, status = 200, cors = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (cors) {
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}
