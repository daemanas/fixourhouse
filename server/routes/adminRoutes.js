  router.route('/reviews/stats').get(protect, authorize('admin'), getReviewStats);
  router.route('/reviews').get(protect, authorize('admin'), getReviews);
  router.route('/reviews/:id').get(protect, authorize('admin'), getReviewById);
  router
    .route('/reviews/:id/hide')
    .patch(protect, authorize('admin'), hideReview);
  router
    .route('/reviews/:id/restore')
    .patch(protect, authorize('admin'), restoreReview);
  router
    .route('/reviews/:id')
    .delete(protect, authorize('admin'), deleteReview);