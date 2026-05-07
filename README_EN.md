# IrisWebOS - Pure Static Web Desktop Experience

## Project Overview

IrisWebOS is a pure static web desktop operating system experience built with Vue 3, providing a complete browser-based desktop environment. It includes core features such as window management, taskbar, terminal, AI assistant, file downloader, and built-in browser.

## Core Features

- **Pure Static Deployment**: No backend services required, can be deployed to any static hosting service
- **Window Management System**: Supports window dragging, resizing, maximizing, minimizing, and multi-window management
- **Built-in Terminal**: Integrated xterm.js with basic command-line operations
- **AI Assistant**: Supports OpenAI-compatible API configuration with direct frontend connection
- **Virtual File System**: Browser-based file system using IndexedDB
- **Theme Switching**: Supports dark/light theme switching

## Tech Stack

- **Frontend Framework**: Vue 3
- **Build Tool**: Vite 5
- **Terminal Component**: xterm.js
- **Event Bus**: mitt
- **WASM Runtime**: @wasmer/wasi (optional)
- **GPU Acceleration**: WebGPU (optional)

## Quick Start

### Install Dependencies

`bash
npm install
`

### Development Mode

`bash
npm run dev
`

Visit http://localhost:3000 to see the result

### Build for Production

`bash
npm run build
`

Build output will be in the `dist` directory

### Preview Production Build

`bash
npm run preview
`

## Deployment

### Deployment Requirements

1. **Static File Hosting**: Only requires a static file server, no Node.js, database, or runtime environment needed
2. **HTTPS Requirement**: WebGPU and WASM advanced features require HTTPS environment (except localhost)
3. **MIME Type Configuration**: Ensure server correctly configures the following MIME types:
   - `.wasm` → `application/wasm`
   - `.json` → `application/json`

### Deploy to Nginx

`nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/iris-webos/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.wasm$ {
        types { application/wasm wasm; }
        add_header Content-Encoding gzip;
    }
}
`

### Deploy to Cloudflare Pages

1. Connect GitHub repository to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. HTTPS automatically enabled

### Deploy to OSS/CDN

1. Upload all files from `dist` directory to OSS
2. Configure static website hosting
3. Enable HTTPS certificate
4. Configure correct MIME types

## Project Structure

`
/
├── index.html                 # Site entry
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
├── /public                    # Static assets
│   ├── /static                # Wallpapers, icons
│   ├── /download              # Downloadable files
│   └── /wasm                  # WASM modules
├── /src                       # Source code
│   ├── /core                  # Core modules
│   │   ├── system.js          # System manager
│   │   ├── window-manager.js  # Window manager
│   │   └── desktop.js         # Desktop manager
│   ├── /components            # UI components
│   ├── /apps                  # App components
│   ├── /fs                    # Virtual file system
│   └── /webgpu                # WebGPU wrapper
└── /dist                      # Build output
`

## Core Features Usage

### Terminal Application

- Supported commands: `ls`, `cd`, `pwd`, `mkdir`, `echo`, `clear`, `help`
- Based on virtual file system with local data persistence

### AI Assistant

1. Open "System Settings" application
2. Configure AI API endpoint (e.g., https://api.openai.com/v1/chat/completions)
3. Enter API Key
4. Select model (e.g., gpt-3.5-turbo)
5. Start conversation

### File Downloader

- Display list of downloadable static files
- Click download button to download files directly
- File list configuration: `public/download/files.json`

### Built-in Browser

- Based on iframe implementation
- Supports forward, backward, refresh
- Default visit to GitHub

## Browser Compatibility

Recommended browsers with WebGPU support:

- Chrome 113+
- Edge 113+
- Arc

Browsers without WebGPU support will show a friendly notice, but basic features remain functional.

## Data Security

- **Local Storage**: All configurations and conversation records stored in localStorage and IndexedDB
- **No Data Upload**: No user data uploaded to cloud
- **Direct API Connection**: AI conversation requests sent directly to user-configured endpoint, no relay
- **One-click Clear**: System settings provide one-click clear all data function

## Development Guide

### Add New Application

1. Create app directory under `src/apps/`
2. Create Vue component (e.g., `MyApp.vue`)
3. Register component in `src/components/Window.vue`
4. Add desktop icon in `src/core/desktop.js`
5. Add app info in `src/components/Taskbar.vue`

### Customize Theme

Modify CSS variables in `src/App.vue`:

`css
--bg-color: #1e1e1e;
--text-color: #ffffff;
--window-bg: #2d2d2d;
--border-color: #3d3d3d;
--taskbar-bg: #252525;
--active-color: #0078d4;
`

## License

MIT License

## Changelog

### v1.0.0 (2025-05-02)

- Initial release
- Complete desktop environment implementation
- Integrated terminal, AI assistant, downloader, browser, settings core applications
- Support for window management and taskbar
- Virtual file system implementation
- Theme switching support
