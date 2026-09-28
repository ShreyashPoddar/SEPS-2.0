// middlewares/usersearch.middleware.js
export const validateSearchQuery = (req, res, next) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return res.json([]);
  }

  next();
};
