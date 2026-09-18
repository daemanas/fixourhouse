import Provider from '../models/Provider.js';
import Withdrawal from '../models/Withdrawal.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computeProviderEarnings } from '../utils/earnings.js';

// @desc    Get current provider's withdrawal requests
// @route   GET /api/v1/withdrawals/me
// @access  Private (Provider)
export const getMyWithdrawals = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const withdrawals = await Withdrawal.find({ providerId: provider._id }).sort({
    createdAt: -1,
  });

  res.status(200).json(
    new ApiResponse(200, { withdrawals }, 'Withdrawals fetched successfully')
  );
});

// @desc    Request a withdrawal
// @route   POST /api/v1/withdrawals/me
// @access  Private (Provider)
export const createWithdrawal = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ userId: req.user._id });
  if (!provider) {
    throw new ApiError(404, 'Provider profile not found');
  }

  const { amount, method, accountDetails } = req.body;

  // Available balance is computed from real earnings/withdrawal data and already
  // reserves pending withdrawals, so a duplicate/concurrent request that would
  // exceed the remaining balance is rejected here (in addition to the client
  // disabling the submit button while a request is in flight).
  const { availableBalance } = await computeProviderEarnings(provider._id);

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new ApiError(400, 'Withdrawal amount must be greater than 0');
  }
  if (amountNum > availableBalance) {
    throw new ApiError(
      400,
      `Insufficient balance. Available balance is ₹${availableBalance.toLocaleString('en-IN')}`
    );
  }

  const withdrawal = await Withdrawal.create({
    providerId: provider._id,
    amount: Math.round(amountNum * 100) / 100,
    status: 'pending',
    method,
    accountDetails,
  });

  res.status(201).json(
    new ApiResponse(201, { withdrawal }, 'Withdrawal request submitted successfully')
  );
});
