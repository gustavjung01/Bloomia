import type { Dispatch as ReactDispatch, SetStateAction as ReactSetStateAction } from 'react';

declare global {
  namespace React {
    type Dispatch<A> = ReactDispatch<A>;
    type SetStateAction<S> = ReactSetStateAction<S>;
  }
}

export {};
