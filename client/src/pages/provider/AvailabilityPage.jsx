import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import {
  getMyAvailability,
  addAvailabilityDay,
  updateAvailabilityDay,
  deleteAvailabilityDay,
} from '../../services/providerService';
import {
  DAY_KEYS,
  DAY_LABELS,
  emptyAvailability,
  normalizeAvailability,
  isDayConfigured,
  formatTimeRange,
} from '../../utils/availability';

// Local id used only to key slot rows while editing (never sent to the API).
const newSlot = () => ({
  id: `slot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  startTime: '',
  endTime: '',
});

export function AvailabilityPage() {
  const [availability, setAvailability] = useState(emptyAvailability);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null); // day key currently being toggled
  const [modal, setModal] = useState(null); // { mode: 'add' } | { mode: 'edit', day }
  const [deleteDay, setDeleteDay] = useState(null); // day key pending deletion
  const [form, setForm] = useState({ day: '', enabled: true, slots: [newSlot()] });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyAvailability();
      setAvailability(normalizeAvailability(response?.data?.data?.availability));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const configuredDays = DAY_KEYS.filter((key) => isDayConfigured(availability[key]));

  const dayOptions = DAY_KEYS.filter((key) =>
    modal?.mode === 'edit'
      ? key === form.day || !isDayConfigured(availability[key])
      : !isDayConfigured(availability[key])
  ).map((key) => ({ value: key, label: DAY_LABELS[key] }));

  const openAddModal = () => {
    setForm({ day: '', enabled: true, slots: [newSlot()] });
    setFormErrors({});
    setModal({ mode: 'add' });
  };

  const openEditModal = (day) => {
    const dayData = availability[day] || { enabled: false, slots: [] };
    const slots = (dayData.slots && dayData.slots.length > 0 ? dayData.slots : [{}]).map((slot) => ({
      ...newSlot(),
      startTime: slot.startTime || '',
      endTime: slot.endTime || '',
    }));
    setForm({ day, enabled: Boolean(dayData.enabled), slots });
    setFormErrors({});
    setModal({ mode: 'edit' });
  };

  const handleSlotChange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)),
    }));
  };

  const addSlotRow = () => {
    setForm((prev) => ({ ...prev, slots: [...prev.slots, newSlot()] }));
  };

  const removeSlotRow = (id) => {
    setForm((prev) => ({
      ...prev,
      slots: prev.slots.length > 1 ? prev.slots.filter((slot) => slot.id !== id) : prev.slots,
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!form.day) errors.day = 'Select a day';

    const filled = form.slots.filter((slot) => slot.startTime && slot.endTime);
    if (filled.length === 0) {
      errors.slots = 'Add at least one complete time slot';
    } else {
      const incomplete = form.slots.some(
        (slot) => (slot.startTime && !slot.endTime) || (!slot.startTime && slot.endTime)
      );
      if (incomplete) errors.slots = 'Every time slot needs both a start and an end time';
      const badRange = filled.some((slot) => slot.endTime <= slot.startTime);
      if (badRange) errors.slots = errors.slots || 'End time must be later than start time';

      const sorted = [...filled].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
      for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          errors.slots = errors.slots || 'Time slots cannot overlap within the same day';
        }
      }
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSubmitting(true);
    const payload = {
      enabled: Boolean(form.enabled),
      slots: form.slots
        .filter((slot) => slot.startTime && slot.endTime)
        .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime })),
    };
    try {
      let response;
      if (modal.mode === 'add') {
        response = await addAvailabilityDay({ day: form.day, ...payload });
      } else {
        response = await updateAvailabilityDay(form.day, payload);
      }
      setAvailability(normalizeAvailability(response?.data?.data?.availability));
      toast.success(
        response?.data?.message ||
          (modal.mode === 'add' ? 'Day added to availability' : 'Availability updated')
      );
      setModal(null);
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      if (typeof serverMessage === 'string') {
        toast.error(serverMessage);
      } else {
        toast.error('Failed to save availability');
      }
      const serverErrors = error.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const fieldErrors = {};
        serverErrors.forEach((err) => {
          if (err?.field) fieldErrors[err.field] = err.message;
        });
        setFormErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (day) => {
    if (savingDay) return;
    const current = availability[day];
    const nextEnabled = !current.enabled;
    setSavingDay(day);
    try {
      const response = await updateAvailabilityDay(day, {
        enabled: nextEnabled,
        slots: current.slots,
      });
      setAvailability(normalizeAvailability(response?.data?.data?.availability));
      toast.success(
        nextEnabled ? `${DAY_LABELS[day]} is now available` : `${DAY_LABELS[day]} is now unavailable`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setSavingDay(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDay) return;
    try {
      const response = await deleteAvailabilityDay(deleteDay);
      setAvailability(normalizeAvailability(response?.data?.data?.availability));
      toast.success(response?.data?.message || 'Day removed');
      setDeleteDay(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove day');
      setDeleteDay(null);
    }
  };

  const renderDayCard = (day, index) => {
    const dayData = availability[day] || { enabled: false, slots: [] };
    const enabled = Boolean(dayData.enabled);
    const ranges = dayData.slots || [];

    return (
      <motion.div
        key={day}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.05 }}
      >
        <Card className={`p-5 sm:p-6 ${enabled ? '' : 'opacity-80'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                <CalendarClock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-ink-light dark:text-ink-dark">{DAY_LABELS[day]}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {enabled ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(day)}
              disabled={savingDay === day}
              aria-pressed={enabled}
              aria-label={`Toggle ${DAY_LABELS[day]} availability`}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                enabled ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              {savingDay === day && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                </span>
              )}
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-4">
            {ranges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ranges.map((range) => (
                  <span
                    key={`${range.startTime}-${range.endTime}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      enabled
                        ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 line-through'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeRange(range)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                No working hours configured.
              </p>
            )}
            {!enabled && ranges.length > 0 && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Existing time slots stay saved but are paused while the day is off.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-border-light dark:border-border-dark">
            <Button variant="outline" size="sm" onClick={() => openEditModal(day)}>
              <Plus className="h-3.5 w-3.5" />
              Add Time Slot
            </Button>
            <Button variant="outline" size="sm" onClick={() => openEditModal(day)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-600 dark:text-danger-400"
              onClick={() => setDeleteDay(day)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Availability</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your weekly working schedule</p>
        </div>
        <Button onClick={openAddModal} disabled={dayOptions.length === 0}>
          <Plus className="h-4 w-4" />
          Add Day
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">Loading availability...</span>
        </div>
      ) : configuredDays.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No working days set up yet"
          description="Add the days you work and set your start and end times for each day."
          action={
            <Button onClick={openAddModal} disabled={dayOptions.length === 0}>
              <Plus className="h-4 w-4" />
              Add Day
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {configuredDays.map((day, index) => renderDayCard(day, index))}
        </div>
      )}

      {/* Add / Edit day modal */}
      <Modal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit Day' : 'Add Working Day'}
        subtitle={
          modal?.mode === 'edit'
            ? 'Update the day, working hours and availability state'
            : 'Pick a day and set one or more start and end time ranges'
        }
      >
        <div className="space-y-5">
          <Select
            label="Day"
            value={form.day}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, day: e.target.value }));
              if (formErrors.day) setFormErrors((prev) => ({ ...prev, day: '' }));
            }}
            options={dayOptions}
            placeholder="Select a day"
            error={formErrors.day}
            disabled={dayOptions.length === 0}
          />
          {dayOptions.length === 0 && modal?.mode === 'add' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">All days are already configured.</p>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-light dark:text-ink-dark">Available on this day</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Turn off to keep the schedule saved but pause it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              aria-pressed={form.enabled}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                form.enabled ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink-light dark:text-ink-dark">Time Slots</label>
              <button
                type="button"
                onClick={addSlotRow}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another time slot
              </button>
            </div>
            <div className="space-y-3">
              {form.slots.map((slot) => (
                <div key={slot.id} className="flex items-end gap-2">
                  <Input
                    type="time"
                    label="Start"
                    value={slot.startTime}
                    onChange={(e) => handleSlotChange(slot.id, 'startTime', e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End"
                    value={slot.endTime}
                    onChange={(e) => handleSlotChange(slot.id, 'endTime', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlotRow(slot.id)}
                    disabled={form.slots.length <= 1}
                    className="h-10 w-10 mb-0.5 flex items-center justify-center rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remove time slot"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {formErrors.slots && (
              <p className="mt-2 text-sm text-danger-600 dark:text-danger-400">{formErrors.slots}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Day'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={Boolean(deleteDay)}
        onClose={() => setDeleteDay(null)}
        title="Delete day?"
        subtitle={deleteDay ? `Remove ${DAY_LABELS[deleteDay]} from your weekly schedule?` : ''}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This removes the day and its time slots from your availability. You can add it again at any time.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteDay(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default AvailabilityPage;
