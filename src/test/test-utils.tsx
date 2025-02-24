/* eslint-disable react-refresh/only-export-components */
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock wagmi provider
const MockWagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return children;
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockWagmiProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </MockWagmiProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render }; 