import React from 'react';
import { Popover } from '@headlessui/react';
import { BadgePercent, ChevronDown, ScanEye, UtensilsCrossed, SwatchBook, Pencil } from 'lucide-react';
import { SiReddit, SiYoutube } from 'react-icons/si';
import { cn } from '../../lib/utils';
import type { FocusProps, FocusMode } from '../../types';

const focusModes: FocusMode[] = [
  {
    key: 'webSearch',
    title: 'Web Search',
    description: 'Search the entire web',
    icon: <ScanEye size={20} />,
  },
  {
    key: 'academicSearch',
    title: 'Academic',
    description: 'Search in published academic papers',
    icon: <SwatchBook size={20} />,
  },
  {
    key: 'writingAssistant',
    title: 'Writing',
    description: 'Chat without searching the web',
    icon: <Pencil size={16} />,
  },
  {
    key: 'wolframAlphaSearch',
    title: 'Wolfram Alpha',
    description: 'Computational knowledge engine',
    icon: <BadgePercent size={20} />,
  },
  {
    key: 'youtubeSearch',
    title: 'Youtube',
    description: 'Search and watch videos',
    icon: (
      <SiYoutube
        className="h-5 w-auto mr-0.5"
      />
    ),
  },
  {
    key: 'redditSearch',
    title: 'Reddit',
    description: 'Search for discussions and opinions',
    icon: (
      <SiReddit
        className="h-5 w-auto mr-0.5"
      />
    ),
  },
  {
    key: 'restaurantSearch',
    title: 'Restaurant Analysis',
    description: 'Analyze restaurants for cheese program fit',
    icon: <UtensilsCrossed size={20} />,
  },
];

const Focus: React.FC<FocusProps> = ({ focusMode, setFocusMode }) => (
  <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg mt-[6.5px]">
    <Popover.Button
      type="button"
      className="text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
    >
      {focusMode !== 'webSearch' ? (
        <div className="flex flex-row items-center space-x-1">
          {focusModes.find((mode) => mode.key === focusMode)?.icon}
          <p className="text-xs font-medium hidden lg:block">
            {focusModes.find((mode) => mode.key === focusMode)?.title}
          </p>
          <ChevronDown size={20} className="-translate-x-1" />
        </div>
      ) : (
        <div className="flex flex-row items-center space-x-1">
          <ScanEye size={20} />
          <p className="text-xs font-medium hidden lg:block">Focus</p>
        </div>
      )}
    </Popover.Button>

    <Popover.Panel className="absolute z-10 w-64 md:w-[500px] left-0">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-light-primary dark:bg-dark-primary border rounded-lg border-light-200 dark:border-dark-200 w-full p-4 max-h-[200px] md:max-h-none overflow-y-auto">
        {focusModes.map((mode) => (
          <Popover.Button
            key={mode.key}
            onClick={() => setFocusMode(mode.key)}
            className={cn(
              'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-2 duration-200 cursor-pointer transition',
              focusMode === mode.key
                ? 'bg-light-secondary dark:bg-dark-secondary'
                : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
            )}
          >
            <div
              className={cn(
                'flex flex-row items-center space-x-1',
                focusMode === mode.key
                  ? 'text-[#24A0ED]'
                  : 'text-black dark:text-white',
              )}
            >
              {mode.icon}
              <p className="text-sm font-medium">{mode.title}</p>
            </div>
            <p className="text-black/70 dark:text-white/70 text-xs">
              {mode.description}
            </p>
          </Popover.Button>
        ))}
      </div>
    </Popover.Panel>
  </Popover>
);

Focus.displayName = 'Focus';

export default Focus;
