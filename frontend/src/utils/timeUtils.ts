export function formatRelativeTime(createdAt: any): string {
  if (!createdAt) return 'Posted just now';
  
  let date: Date;
  if (createdAt.toDate && typeof createdAt.toDate === 'function') {
    date = createdAt.toDate();
  } else if (createdAt.seconds) {
    date = new Date(createdAt.seconds * 1000);
  } else {
    date = new Date(createdAt);
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Posted just now';
  }
  
  const diffInMins = Math.floor(diffInSeconds / 60);
  if (diffInMins < 60) {
    return `Posted ${diffInMins} min${diffInMins === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) {
    return `Posted ${diffInHours} hr${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Posted ${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
}
