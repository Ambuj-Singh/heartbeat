function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] || {});

    if (!result.success) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Invalid request data.",
        details: formatZodIssues(result.error)
      });
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = {
  formatZodIssues,
  validate
};
