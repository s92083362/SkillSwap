"use client";
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  suggestions?: string[];
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search skills (e.g., Python, Java, Beginners)...",
  suggestions = [],
  onClear
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const defaultSuggestions = [
    "Python for beginners", "JavaScript essentials", "Java programming", "C programming",
    "Beginner courses", "Advanced tutorials", "Web development", "Frontend development",
    "Backend development", "Full stack", "Data structures", "Algorithms"
  ];
  const allSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  useEffect(() => {
    if (value.trim()) {
      const filtered = allSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleSuggestionClick = (suggestion: string) => {
    const syntheticEvent = { target: { value: suggestion } } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    const syntheticEvent = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowSuggestions(false);
    if (onClear) onClear();
  };

  return (
    <div className="max-w-4xl mx-auto mb-8 sm:mb-12 relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={() => value.trim() && setShowSuggestions(filteredSuggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          placeholder={placeholder}
          className="w-full pl-10 pr-12 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          aria-label="Search"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border max-h-64 overflow-y-auto">
          <ul className="py-2">
            {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-700 text-sm flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!value && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          <span className="text-xs text-gray-500">Popular:</span>
          {["Python", "JavaScript", "Beginners", "Advanced", "Web Dev"].map((tag) => (
            <button
              key={tag}
              onClick={() => handleSuggestionClick(tag)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
