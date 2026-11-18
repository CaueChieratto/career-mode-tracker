import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import Styles from "./CustomSelect.module.css";

type CustomSelectProps = {
  name: string;
  options: readonly string[];
  value: string;
  placeholder?: string;
  onChange: (event: { target: { name: string; value: string } }) => void;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
};

const CustomSelect = ({
  name,
  options,
  value,
  placeholder,
  onChange,
  className,
  containerClassName,
  disabled = false,
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (optionValue: string) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  useEffect(() => {
    const handleInteractionOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleInteractionOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleInteractionOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.indexOf(value);
      const targetIndex = currentIndex >= 0 ? currentIndex : 0;
      setHighlightedIndex((prev) =>
        prev === targetIndex ? prev : targetIndex,
      );
    } else {
      setHighlightedIndex((prev) => (prev === -1 ? prev : -1));
    }
  }, [isOpen, options, value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case " ":
        event.preventDefault();
        setIsOpen((prev) => {
          if (prev && highlightedIndex >= 0) {
            handleOptionClick(options[highlightedIndex]);
            return false;
          }
          return true;
        });
        break;

      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const modifier = event.key === "ArrowDown" ? 1 : -1;
          setHighlightedIndex((prev) => {
            const newIndex =
              (prev + modifier + options.length) % options.length;
            return newIndex;
          });
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Tab":
        if (isOpen) {
          setTimeout(() => {
            if (
              selectRef.current &&
              !selectRef.current.contains(document.activeElement)
            ) {
              setIsOpen(false);
            }
          }, 0);
        }
        break;
    }
  };

  const handleFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  const handleTriggerMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const displayValue = value || placeholder;

  return (
    <div
      className={`${Styles.custom_select_container} ${
        disabled ? Styles.disabled : ""
      } swiper-no-swiping`}
      ref={selectRef}
    >
      <div
        className={
          className
            ? className
            : `${Styles.select_trigger} ${containerClassName ?? ""}`.trim()
        }
        onMouseDown={handleTriggerMouseDown}
        onFocus={handleFocus}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={
            !value && Boolean(placeholder) ? Styles.placeholder : undefined
          }
        >
          {displayValue}
        </span>
        <FaChevronDown
          className={`${Styles.chevron} ${isOpen ? Styles.open : ""}`}
        />
      </div>
      {isOpen && (
        <ul className={Styles.options_list}>
          {options.map((option, index) => (
            <li
              key={option}
              className={`${Styles.option_item} ${
                value === option ? Styles.selected : ""
              } ${index === highlightedIndex ? Styles.highlighted : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOptionClick(option);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={value === option}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
