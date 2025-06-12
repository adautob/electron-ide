import type { SVGProps } from 'react';

export function IdeLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M6 4H18V6H6V4ZM6 8H14V10H6V8ZM6 12H18V14H6V12ZM6 16H14V18H6V16ZM15 7L19 9.5L15 12V7Z" fill="currentColor" />
    </svg>
  );
}
