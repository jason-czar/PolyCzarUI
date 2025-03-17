// DateSelector.jsx
import React, { useEffect, useState } from 'react';

function DateSelector({ selectedDate, onDateSelect, availableDates = [], optionType }) {
  const [fridays, setFridays] = useState([]);
  
  useEffect(() => {
    // Generate the next 16 Fridays
    const generateFridays = () => {
      const dates = [];
      const today = new Date("2025-03-13"); // Using the current date from metadata
      
      // Find the next Friday
      let nextFriday = new Date(today);
      const dayOfWeek = today.getDay(); // 0 is Sunday, 5 is Friday
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
      
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      
      // Set to midnight to avoid time issues
      nextFriday.setHours(0, 0, 0, 0);
      
      // Generate 16 consecutive Fridays
      for (let i = 0; i < 16; i++) {
        const fridayDate = new Date(nextFriday);
        dates.push(fridayDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
        nextFriday.setDate(nextFriday.getDate() + 7); // Add 7 days for next Friday
      }
      
      setFridays(dates);
      
      // If no date is selected, select the first Friday
      if (!selectedDate && dates.length > 0 && onDateSelect) {
        onDateSelect(dates[0]);
      }
    };
    
    generateFridays();
  }, []); // Empty dependency array to run only once on mount

  const formatDate = (date) => {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`; // Add space between month and day
  };

  // Use the generated Fridays if available, otherwise fall back to availableDates
  const displayDates = fridays.length > 0 ? fridays : availableDates;

  // Determine button colors based on option type
  const getButtonColors = () => {
    if (optionType === 'put') {
      return {
        textColor: 'text-[#E64801]',
        bgColor: 'bg-[#E64801]'
      };
    }
    return {
      textColor: 'text-[#24AE60]',
      bgColor: 'bg-[#24AE60]'
    };
  };

  const { textColor, bgColor } = getButtonColors();

  return (
    <div className="flex overflow-x-auto mb-[3px] gap-2 pb-2 whitespace-nowrap bg-transparent scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="flex gap-2 px-1">
        {displayDates.map((date) => {
          const formattedDate = formatDate(date);
          const isSelected = selectedDate === date;
          
          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={`px-3 py-1 rounded-xl text-sm ${
                isSelected ? `${bgColor} text-black` : textColor
              } transition-colors flex-shrink-0`}
            >
              {formattedDate}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DateSelector;