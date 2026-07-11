import React, { forwardRef } from 'react';
import { BaseInput, InputProps } from './BaseInput';
import NumpadInput from './NumpadInput';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ type, ...props }, ref) => {
    // Se è un input numerico, deviamo automaticamente sul Custom Numpad
    if (type === 'number') {
      return (
        <NumpadInput 
          {...props}
          value={props.value as string | number || ''}
          onChange={(val: string) => {
            if (props.onChange) {
              // Simuliamo un evento React fittizio in modo da non rompere il codice esistente
              const syntheticEvent = {
                target: { value: val, name: props.name }
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              props.onChange(syntheticEvent);
            }
          }}
        />
      );
    }

    return (
      <BaseInput
        type={type}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
