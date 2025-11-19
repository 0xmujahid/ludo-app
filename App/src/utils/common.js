export const truncateString = (value, length = 10) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.length > length ? value.slice(0, length) + '...' : value;
};
