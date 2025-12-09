import React, { MouseEventHandler } from 'react';
import {
    Plus, Clock, Trash2, Calendar, ChevronLeft, ChevronRight,
    CheckSquare, Square, Sun, Moon, Target, Edit, LucideProps
} from 'lucide-react';

const RolloverIcon = (props: LucideProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 7.21v11.58a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.21c0-1.13.84-2.12 1.95-2.21l.6-.05h13.25c1.11.09 1.95 1.08 1.95 2.21z" />
        <path d="m11.2 14.8-1.6 1.6 1.6 1.6" />
        <path d="M12 16.4h-.4c-1.12 0-2-.88-2-2V10c0-1.12.88-2 2-2h4" />
    </svg>
);

const icons = {
    Plus, Clock, Trash2, Calendar, ChevronLeft, ChevronRight,
    CheckSquare, Square, Sun, Moon, Target, Edit,
    Rollover: RolloverIcon
};

export type IconName = keyof typeof icons;

interface IconProps {
    name: IconName;
    className?: string;
    onClick?: MouseEventHandler<SVGSVGElement>;
}

export const Icon: React.FC<IconProps> = ({ name, className, onClick }) => {
    const IconComponent = icons[name];
    if (!IconComponent) return <div />;
    // Pass className and onClick to the icon component
    return <IconComponent className={className} onClick={onClick} />;
};
