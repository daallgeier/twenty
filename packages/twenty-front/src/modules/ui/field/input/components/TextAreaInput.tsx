import { ChangeEvent, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import styled from '@emotion/styled';

import { useRegisterInputEvents } from '@/object-record/record-field/meta-types/input/hooks/useRegisterInputEvents';
import { textInputStyle } from '@/ui/theme/constants/effects';

export type TextAreaInputProps = {
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  value: string;
  onEnter: (newText: string) => void;
  onEscape: (newText: string) => void;
  onTab?: (newText: string) => void;
  onShiftTab?: (newText: string) => void;
  onClickOutside: (event: MouseEvent | TouchEvent, inputValue: string) => void;
  hotkeyScope: string;
  onChange?: (newText: string) => void;
};

const StyledTextArea = styled(TextareaAutosize)`
  ${textInputStyle}
  width: 100%;
  resize: none;
  box-shadow: ${({ theme }) => theme.boxShadow.strong};
  border: ${({ theme }) => `1px solid ${theme.border.color.light}`};
  padding: ${({ theme }) => theme.spacing(2)};
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
`;

export const TextAreaInput = ({
  disabled,
  className,
  placeholder,
  autoFocus,
  value,
  hotkeyScope,
  onEnter,
  onEscape,
  onTab,
  onShiftTab,
  onClickOutside,
  onChange,
}: TextAreaInputProps) => {
  const [internalText, setInternalText] = useState(value);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInternalText(event.target.value);
    onChange?.(event.target.value);
  };

  const wrapperRef = useRef<HTMLTextAreaElement>(null);

  useRegisterInputEvents({
    inputRef: wrapperRef,
    inputValue: internalText,
    onEnter,
    onEscape,
    onClickOutside,
    onTab,
    onShiftTab,
    hotkeyScope,
  });

  return (
    <StyledTextArea
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      ref={wrapperRef}
      onChange={handleChange}
      autoFocus={autoFocus}
      value={internalText}
    />
  );
};
