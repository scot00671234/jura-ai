# Overview

This is a Danish legal AI assistant application that provides semantic search and conversational interaction with Danish law texts. The system combines data from the Retsinformation API with AI-powered embeddings and chat functionality to help users understand and navigate Danish legal information.

The application features a modern web interface built with React and TypeScript, backed by a Node.js/Express server with PostgreSQL database storage. It uses machine learning embeddings for semantic search of legal texts and integrates with language models for conversational responses.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite with ESM modules and path aliases

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized middleware for error processing

## Database Design
- **Primary Database**: PostgreSQL with vector extensions for embeddings
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Key Tables**:
  - Users for authentication
  - Legal domains for categorization
  - Law texts with full content and metadata
  - Text embeddings with 384-dimensional vectors
  - Chat sessions and messages with citations

## AI and Machine Learning
- **Embeddings Model**: Xenova/all-MiniLM-L6-v2 (384 dimensions)
- **Similarity Search**: PostgreSQL vector operations with HNSW indexing
- **Text Processing**: Client-side transformers.js for embeddings generation
- **LLM Integration**: Configurable endpoint for language model responses
- **Citation System**: Relevance scoring and snippet extraction from legal texts

## External Integrations
- **Retsinformation API**: Danish legal information source
- **Vector Search**: PostgreSQL with pgvector extension
- **Authentication**: Session-based with secure cookies
- **File Serving**: Static asset handling for production builds

## Development Workflow
- **Development Server**: Vite with HMR and Express middleware
- **Build Process**: TypeScript compilation with esbuild for server code
- **Database Operations**: Drizzle push for schema synchronization
- **Environment Configuration**: Environment variables for API keys and database connections

# External Dependencies

## Core Frameworks
- **React**: Frontend framework with hooks and concurrent features
- **Express**: Backend web framework for Node.js
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Vite**: Frontend build tool and development server

## Database and Storage
- **@neondatabase/serverless**: PostgreSQL connection pooling
- **drizzle-orm**: Database query builder and migrations
- **connect-pg-simple**: PostgreSQL session store for Express
- **pgvector**: Vector similarity search (implied by vector operations)

## AI and Machine Learning
- **@xenova/transformers**: Client-side machine learning models
- **TanStack Query**: Server state management and caching

## UI and Styling
- **@radix-ui/***: Accessible UI component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **Lucide React**: Icon library

## Development Tools
- **TypeScript**: Static type checking
- **Wouter**: Lightweight routing library
- **@hookform/resolvers**: Form validation integration
- **date-fns**: Date manipulation utilities

## External APIs
- **Retsinformation API**: Danish legal information service
- **Configurable LLM Endpoint**: Language model integration (Ollama or similar)
- **Replit Development Tools**: Development environment enhancements