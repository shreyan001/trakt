import { Redis } from '@upstash/redis';

// Initialize Redis client with Upstash configuration
const redis = new Redis({
  url: 'https://settled-turtle-12787.upstash.io',
  token: 'ATHzAAIncDJlMTI5ZGQ4ZWRmMjg0MTk0ODI4YTk2YzkxN2I1MzczM3AyMTI3ODc',
});

// Example function demonstrating Redis operations
export async function redisExample() {
  try {
    // Set a key-value pair
    console.log('Setting foo = bar');
    await redis.set('foo', 'bar');
    
    // Get the value
    console.log('Getting foo:');
    const value = await redis.get('foo');
    console.log('Value:', value);
    
    // Additional examples
    
    // Set with expiration (10 seconds)
    await redis.set('temp-key', 'temporary-value', { ex: 10 });
    
    // Increment a counter
    await redis.incr('counter');
    const counter = await redis.get('counter');
    console.log('Counter:', counter);
    
    // Hash operations
    await redis.hset('user:1', {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });
    
    const user = await redis.hgetall('user:1');
    console.log('User:', user);
    
    // List operations
    await redis.lpush('tasks', 'task1', 'task2', 'task3');
    const tasks = await redis.lrange('tasks', 0, -1);
    console.log('Tasks:', tasks);
    
    return { success: true, value, counter, user, tasks };
  } catch (error) {
    console.error('Redis error:', error);
    return { success: false, error: error.message };
  }
}

// Usage example
if (require.main === module) {
  redisExample().then(result => {
    console.log('Result:', result);
  });
}