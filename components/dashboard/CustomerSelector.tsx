'use client';

import { useDashboardStore } from '@/lib/store';

export default function CustomerSelector() {
  const { customers, selectedCustomer, setCustomer } = useDashboardStore();

  return (
    <select
      value={selectedCustomer || 'all'}
      onChange={(e) => setCustomer(e.target.value === 'all' ? null : e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
    >
      <option value="all">All Customers</option>
      {customers.map((customer) => (
        <option key={customer} value={customer}>
          {customer}
        </option>
      ))}
    </select>
  );
}

