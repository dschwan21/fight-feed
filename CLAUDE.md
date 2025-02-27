# Fight Feed Development Guide

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint 

## Code Style Guidelines
- **Imports**: Sort imports by external, then internal. Group by functionality.
- **Component Structure**: Use functional components with React hooks.
- **Naming**: PascalCase for components, camelCase for variables and functions.
- **CSS**: Use Tailwind classes with custom theme colors from tailwind.config.js.
- **Path Aliases**: Use `@/*` imports to reference files from the src directory.
- **State Management**: Use React Context for shared state (see AuthProvider).
- **Components**: Add descriptive comments before major UI sections with emojis (e.g., `{/* 👤 User Options */}`).
- **API Routes**: Organize by resource with nested dynamic routes for related operations.
- **Error Handling**: Use try/catch blocks in API routes and async operations.
- **TypeScript**: Although not currently used, consider adding for larger features.