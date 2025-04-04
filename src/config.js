// Feature flags and environment configuration
const isTrue = (value) => {
  return value === true || value === "true";
};

export const FEATURES = {
  SHOW_ADMIN: isTrue(process.env.REACT_APP_IS_ADMIN) && !isTrue(process.env.REACT_APP_DISABLE_ADMIN),
  REQUIRE_LOGIN: isTrue(process.env.REACT_APP_REQUIRE_LOGIN)
};