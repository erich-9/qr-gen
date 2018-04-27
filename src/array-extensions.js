Array.prototype.merge = function() {
  return [].concat(...this);
};

Array.init = function(initFunc, length) {
  const res = new Array(length);

  for (let i = 0; i < length; ++i)
    res[i] = initFunc(i);

  return res;
};
