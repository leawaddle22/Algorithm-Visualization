export function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Required page element "#${id}" was not found.`);
  }
  return element;
}
