import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModernDatePickerProps {
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
  error?: boolean;
  iconClassName?: string;
}

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  selected,
  onChange,
  minDate = new Date(),
  placeholder = "Select Date",
  className,
  error,
  iconClassName
}) => {
  const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={cn("relative w-full", className)}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        minDate={minDate}
        placeholderText={placeholder}
        dateFormat="dd MMM yyyy"
        portalId="root"
        className={cn(
          "w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500",
          error ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 text-slate-700",
          "placeholder:text-slate-400"
        )}
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between px-2 py-2">
            <button
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              type="button"
              className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex gap-1">
              <select
                value={getYear(date)}
                onChange={({ target: { value } }) => changeYear(parseInt(value))}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer hover:text-indigo-600"
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={months[getMonth(date)]}
                onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer hover:text-indigo-600"
              >
                {months.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              type="button"
              className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      />
      <Calendar 
        size={16} 
        className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none", iconClassName)} 
      />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
          overflow: hidden;
          z-index: 50;
        }
        .react-datepicker-popper {
          z-index: 50 !important;
        }
        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding-top: 0;
        }
        .react-datepicker__day-name {
          color: #64748b;
          font-weight: 700;
          font-size: 0.7rem;
          text-transform: uppercase;
          width: 2.5rem;
          line-height: 2.5rem;
          margin: 0;
        }
        .react-datepicker__day {
          width: 2.5rem;
          line-height: 2.5rem;
          margin: 0;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          color: #1e293b;
        }
        .react-datepicker__day:hover {
          background-color: #f1f5f9;
        }
        .react-datepicker__day--selected {
          background-color: #4f46e5 !important;
          color: white !important;
          font-weight: 700;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: #e0e7ff;
          color: #4338ca;
        }
        .react-datepicker__day--outside-month {
          color: #cbd5e1;
        }
        .react-datepicker__day--disabled {
          color: #f1f5f9;
        }
        .react-datepicker__month {
          margin: 0;
          padding: 0.5rem;
        }
      `}} />
    </div>
  );
};
