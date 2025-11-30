import { canRefresh, getWeatherData } from '$lib/server/weather';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check if refresh is allowed
    if (forceRefresh && !canRefresh()) {
      return json(
        {
          error:
            'Refresh not allowed yet. Please wait at least 5 minutes between refreshes.',
        },
        { status: 429 }
      );
    }

    const data = await getWeatherData(forceRefresh);

    return json(data);
  } catch (e) {
    console.error('Weather API error:', e);
    throw error(500, {
      message: e instanceof Error ? e.message : 'Failed to fetch weather data',
    });
  }
};
