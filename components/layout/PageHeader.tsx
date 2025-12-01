'use client';

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
      {description && (
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          {description}
        </p>
      )}
    </div>
  );
}
