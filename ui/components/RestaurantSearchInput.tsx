import React, { FormEvent, ChangeEvent } from 'react';
import { cn } from '../lib/utils';

interface Props {
  onSubmit: (restaurantName: string, address: string) => void;
  className?: string;
}

const RestaurantSearchInput = React.forwardRef<HTMLFormElement, Props>(
  ({ onSubmit, className }, ref) => {
    const [restaurantName, setRestaurantName] = React.useState('');
    const [address, setAddress] = React.useState('');

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (restaurantName && address) {
        onSubmit(restaurantName, address);
        setRestaurantName('');
        setAddress('');
      }
    };

    return (
      <form ref={ref} onSubmit={handleSubmit} className={cn('flex flex-col gap-2', className)}>
        <input
          type="text"
          placeholder="Restaurant Name"
          value={restaurantName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setRestaurantName(e.target.value)}
          className="w-full p-2 rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary"
        />
        <input
          type="text"
          placeholder="Restaurant Address"
          value={address}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
          className="w-full p-2 rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary"
        />
        <button
          type="submit"
          disabled={!restaurantName || !address}
          className="w-full p-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analyze Restaurant
        </button>
      </form>
    );
  }
);

RestaurantSearchInput.displayName = 'RestaurantSearchInput';

export default RestaurantSearchInput;