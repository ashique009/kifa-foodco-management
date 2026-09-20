import { TripShop } from '../types';

export interface TripShopProgress {
  completedShops: number;
  totalShops: number;
  allCompleted: boolean;
  completedShopsList: TripShop[];
}

/**
 * Calculates visited/completed progress for trip shops.
 */
export const getTripShopProgress = (shops?: TripShop[]): TripShopProgress => {
  const list = shops || [];
  const completedShopsList = list.filter((s) => s.status === 'completed');
  const completedShops = completedShopsList.length;
  const totalShops = list.length;
  const allCompleted = completedShops === totalShops && totalShops > 0;

  return {
    completedShops,
    totalShops,
    allCompleted,
    completedShopsList,
  };
};
