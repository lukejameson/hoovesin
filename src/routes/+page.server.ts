import { canRefresh, getWeatherData } from '$lib/server/weather';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const weather = await getWeatherData();
    const canRefreshNow = canRefresh();

    return {
      weather,
      canRefresh: canRefreshNow,
      error: null,
    };
  } catch (e) {
    console.error('Failed to load weather data:', e);
    return {
      weather: null,
      canRefresh: true,
      error: e instanceof Error ? e.message : 'Failed to load weather data',
    };
  }
};
