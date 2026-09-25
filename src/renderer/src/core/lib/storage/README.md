# Cached Storage Implementation for Zarrita

This directory contains an enhanced caching storage implementation for the @zarrita/storage package. The implementation provides three key features you requested:

## Features

### 1. ✅ Result Caching with Expiration
- All fetched data is automatically cached with configurable expiration (default: 24 hours)
- Three-layer caching strategy:
  - **Memory cache**: Fastest access for frequently used data
  - **localStorage**: Persistent storage for small items (≤64KB by default)
  - **IndexedDB**: Persistent storage for larger items

### 2. ✅ Duplicate Request Prevention
- Multiple simultaneous requests for the same key result in only one network call
- Pending requests are tracked and shared across concurrent calls
- Dramatically reduces redundant network traffic

### 3. ✅ LocalStorage with 1-Day Expiration
- Small items are automatically stored in localStorage with 24-hour expiration
- Configurable size threshold (default: 64KB)
- Automatic cleanup of expired entries

## Files

- **`CachedStorage.ts`**: Base caching wrapper that can wrap any AsyncReadable storage
- **`cached-store.tsx`**: Enhanced S3Store with caching capabilities
- **`cached-zarr.tsx`**: Drop-in replacement for zarr array operations with caching
- **`example-usage.ts`**: Complete usage examples and migration guide

## Quick Start

### Option 1: Use the Enhanced S3Store

```typescript
import { CachedS3Store } from "./cached-store";
import { AwsClient } from "aws4fetch";

// Create AWS client
const aws = new AwsClient({
  accessKeyId: "your-key",
  secretAccessKey: "your-secret",
  service: "s3",
});

// Create cached store
const cachedStore = new CachedS3Store(
  "https://your-bucket.s3.amazonaws.com/data",
  aws,
  {}, // FetchStore options
  {
    dbName: "my-app-cache",
    maxLocalStorageSize: 128 * 1024, // 128KB
    cacheExpirationMs: 24 * 60 * 60 * 1000, // 1 day
  }
);

// Use exactly like the original S3Store
const data = await cachedStore.get("/path/to/data");
```

### Option 2: Use Enhanced Zarr Array Loader

```typescript
import { openZarrArrayCached } from "./cached-zarr";

// Drop-in replacement for openZarrArray
const { data, metadata } = await openZarrArrayCached(
  "https://your-bucket.s3.amazonaws.com/array.zarr",
  {
    dbName: "zarr-cache",
    maxLocalStorageSize: 64 * 1024,
    cacheExpirationMs: 24 * 60 * 60 * 1000,
  }
);
```

### Option 3: Wrap Any Storage Implementation

```typescript
import { CachedStorage } from "./CachedStorage";

// Wrap any AsyncReadable storage
const cachedStorage = new CachedStorage(yourExistingStorage, {
  maxLocalStorageSize: 64 * 1024,
  cacheExpirationMs: 24 * 60 * 60 * 1000,
});
```

## Migration Guide

### From Original S3Store

**Before:**
```typescript
import { S3Store } from "./store";
const store = new S3Store(url, aws);
```

**After:**
```typescript
import { CachedS3Store } from "./cached-store";
const store = new CachedS3Store(url, aws);
```

### From Original openZarrArray

**Before:**
```typescript
import { openZarrArray } from "./store";
const { data, metadata } = await openZarrArray(url);
```

**After:**
```typescript
import { openZarrArrayCached } from "./cached-zarr";
const { data, metadata } = await openZarrArrayCached(url);
```

## Cache Management

### Clear All Cache
```typescript
await cachedStore.clearCache();
```

### Clear Cache by Pattern
```typescript
// Clear cache for specific URL pattern
await cachedStore.clearCacheForPattern(/\/data\/experiment-1\//);
```

### Get Cache Statistics
```typescript
const stats = cachedStore.getCacheStats();
console.log(`Memory cache: ${stats.memoryCacheSize} items`);
console.log(`Pending requests: ${stats.pendingRequestsCount}`);
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `dbName` | `"zarr-cache-db"` | IndexedDB database name |
| `storeName` | `"zarr-chunks"` | IndexedDB store name |
| `maxLocalStorageSize` | `64 * 1024` (64KB) | Max size for localStorage items |
| `cacheExpirationMs` | `24 * 60 * 60 * 1000` (1 day) | Cache expiration time |

## Performance Benefits

1. **Reduced Network Traffic**: Cached items are served immediately without network requests
2. **Deduplication**: Multiple components requesting same data share single network call
3. **Offline Capability**: Cached data works even when offline (until expiration)
4. **Memory Efficiency**: Three-tier storage prevents memory bloat while maintaining speed

## Cache Storage Strategy

1. **First Request**: Data fetched from network, stored in all cache layers
2. **Subsequent Requests**:
   - Check memory cache first (fastest)
   - Check localStorage for small items (fast, persistent)
   - Check IndexedDB for large items (slower, persistent)
   - Fall back to network if not cached or expired

## Browser Support

- **Memory Cache**: All modern browsers
- **localStorage**: All modern browsers (with 5-10MB limit)
- **IndexedDB**: All modern browsers (with larger storage limits)

The implementation gracefully degrades if any storage layer is unavailable.
