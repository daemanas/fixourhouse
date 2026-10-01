export function redirectToLogin(navigate, location, state = {}) {
  navigate('/auth/login', {
    state: {
      ...state,
      from: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
    },
  });
}
