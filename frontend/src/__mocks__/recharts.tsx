// Mock for recharts - renders simple divs in jsdom
import React from 'react';

const createMockComponent = (name: string) => {
  const MockComponent = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid={`mock-${name}`} {...filterProps(props)}>
      {children}
    </div>
  );
  MockComponent.displayName = name;
  return MockComponent;
};

// Filter out non-DOM props to avoid React warnings
const filterProps = (props: Record<string, unknown>) => {
  const domSafe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (key.startsWith('data-') || key === 'className' || key === 'id' || key === 'style') {
        domSafe[key] = value;
      }
    }
  }
  return domSafe;
};

export const AreaChart = createMockComponent('AreaChart');
export const LineChart = createMockComponent('LineChart');
export const BarChart = createMockComponent('BarChart');
export const PieChart = createMockComponent('PieChart');
export const Area = createMockComponent('Area');
export const Line = createMockComponent('Line');
export const Bar = createMockComponent('Bar');
export const XAxis = createMockComponent('XAxis');
export const YAxis = createMockComponent('YAxis');
export const CartesianGrid = createMockComponent('CartesianGrid');
export const Tooltip = createMockComponent('Tooltip');
export const Legend = createMockComponent('Legend');
export const ResponsiveContainer = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="mock-ResponsiveContainer" style={{ width: '100%', height: '100%' }}>
    {children}
  </div>
);
export const Cell = createMockComponent('Cell');
export const Pie = createMockComponent('Pie');
