import { useState, useRef, useEffect, useMemo } from "react";
import { FaChevronDown } from "react-icons/fa";
import Styles from "./SearchableSelect.module.css";

type SearchableSelectProps = {
  name: string;
  options: readonly string[];
  value: string;
  placeholder?: string;
  onChange: (event: {
    target: { name: string; value: string; isExplicitSelection?: boolean };
  }) => void;
  onSelectOption?: (option: string, name: string) => void;
  disabled?: boolean;
  className?: string;
  useAlternateStyle?: boolean;
};

const normalize = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const SearchableSelect = ({
  name,
  options,
  value,
  placeholder,
  onChange,
  onSelectOption,
  className,
  disabled = false,
  useAlternateStyle,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const query = normalize(value || "").trim();
    if (!query) return options;
    return options.filter((opt) => normalize(opt).includes(query));
  }, [options, value]);

  const handleOptionClick = (optionValue: string) => {
    onChange({ target: { name, value: optionValue, isExplicitSelection: true } });
    onSelectOption?.(optionValue, name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ target: { name, value: e.target.value, isExplicitSelection: false } });
    setIsOpen(true);
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
      setHighlightedIndex(-1);
    }
  }, [isOpen, filteredOptions]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (
          isOpen &&
          highlightedIndex >= 0 &&
          filteredOptions[highlightedIndex]
        ) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          const modifier = event.key === "ArrowDown" ? 1 : -1;
          setHighlightedIndex((prev) => {
            return (
              (prev + modifier + filteredOptions.length) %
              filteredOptions.length
            );
          });
        }
        break;
      case "Escape":
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      inputRef.current?.focus();
      setIsOpen(true);
    }
  };

  return (
    <div
      className={`${
        useAlternateStyle ? Styles.container : Styles.custom_select_container
      } ${disabled ? Styles.disabled : ""}`}
      ref={selectRef}
      onKeyDown={handleKeyDown}
    >
      <div
        className={className ? className : Styles.select_trigger}
        onClick={handleTriggerClick}
      >
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          className={Styles.search_input}
          disabled={disabled}
          autoComplete="off"
        />
        <FaChevronDown
          className={`${Styles.chevron} ${isOpen ? Styles.open : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (!isOpen) inputRef.current?.focus();
              setIsOpen(!isOpen);
            }
          }}
        />
      </div>
      {isOpen && (
        <ul className={Styles.options_list}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={`${option}-${index}`}
                className={`${Styles.option_item} ${
                  value === option ? Styles.selected : ""
                } ${index === highlightedIndex ? Styles.highlighted : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleOptionClick(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option}
              </li>
            ))
          ) : (
            <li className={Styles.no_options}>Nenhuma opção encontrada</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
