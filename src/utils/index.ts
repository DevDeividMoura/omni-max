export const capitalizeFirstLetterOfWords = (str: string) => {
  return str.replace(/\b\w/g, function(letter) {
    return letter.toUpperCase();
  });
}