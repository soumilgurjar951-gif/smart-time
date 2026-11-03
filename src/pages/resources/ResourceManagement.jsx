// src/pages/resources/ResourceManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Calendar,
  Edit2,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ResourceForm from '../../components/forms/ResourceForm';
import BookingForm from '../../components/forms/BookingForm';
import { resourceService } from '../../services/resourceService';
import { useOdrms } from '../../context/OdrmsContext';
import { useAuth } from '../../context/AuthContext';
import { RESOURCE_TYPES } from '../../utils/constants';

export default function ResourceManagement() {
  const { user, isHod } = useAuth();
  const { showToast, refreshCounts, addActivity } = useOdrms();

  const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'bookings'
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resList, bkgList] = await Promise.all([
        resourceService.getAllResources(),
        resourceService.getAllBookings(),
      ]);
      setResources(resList);
      setBookings(bkgList);
    } catch {
      showToast('Error loading resource data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchType = typeFilter === 'All' || r.type === typeFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchSearch =
        search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase()) ||
        (r.dedicatedFor && r.dedicatedFor.toLowerCase().includes(search.toLowerCase()));

      return matchType && matchStatus && matchSearch;
    });
  }, [resources, typeFilter, statusFilter, search]);

  const handleCreateResource = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await resourceService.createResource(formData);
      setResources((prev) => [created, ...prev]);
      showToast(`Resource "${created.name}" created!`);
      setIsAddResourceModalOpen(false);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error creating resource.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateResource = async (formData) => {
    if (!editingResource) return;
    setIsSubmitting(true);
    try {
      const updated = await resourceService.updateResource(editingResource.id, formData);
      setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Resource "${updated.name}" updated!`);
      setEditingResource(null);
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error updating resource.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBooking = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await resourceService.createBookingRequest(formData);
      setBookings((prev) => [created, ...prev]);
      showToast(`Booking request for ${created.resourceName} submitted!`);
      addActivity(`Booking Requested: ${created.resourceName}`, `By ${created.requestedByName} for ${created.section}`, 'resource');
      setIsBookingModalOpen(false);
      setActiveTab('bookings');
      refreshCounts();
    } catch (err) {
      showToast(err.message || 'Error submitting booking.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewBooking = async (status) => {
    if (!reviewingBooking) return;
    setIsSubmitting(true);
    try {
      const updated = await resourceService.reviewBooking(reviewingBooking.id, {
        status,
        approvedBy: user?.name || 'Dr. Rajiv Sharma (HOD)',
        decisionNotes,
      });
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      showToast(`Booking request ${status}!`);
      addActivity(`Booking ${status}: ${updated.resourceName}`, `Decision by HOD`, 'resource');
      setReviewingBooking(null);
      setDecisionNotes('');
      // Refresh resources status as well
      const res = await resourceService.getAllResources();
      setResources(res);
      refreshCounts();
    } catch {
      showToast('Error recording review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Classrooms, Computer Labs & Departmental Equipment</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Resource Management & Lab Booking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Smart Classrooms 301/302, Turing Block computing clusters, seminar hall, and mobile projectors for 5th Sem CSIT.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            icon={Calendar}
            className="bg-electric-600 hover:bg-electric-700 text-white"
          >
            Request Resource Booking
          </Button>

          {isHod && (
            <Button
              onClick={() => setIsAddResourceModalOpen(true)}
              variant="secondary"
              icon={Plus}
            >
              Add New Resource
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-midnight-800 p-1 rounded-2xl border border-slate-200 dark:border-midnight-700 w-fit">
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'resources'
              ? 'bg-white dark:bg-midnight-900 text-electric-600 dark:text-electric-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Department Inventory ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'bookings'
              ? 'bg-white dark:bg-midnight-900 text-electric-600 dark:text-electric-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <span>Booking Requests & Logs</span>
          {bookings.filter((b) => b.status === 'Pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>

      {activeTab === 'resources' ? (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search resources by name, location, or features..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Resource Types</option>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Availability</option>
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </div>
          </div>

          {/* Resources Grid */}
          {loading ? (
            <LoadingSpinner message="Scanning departmental facility status..." />
          ) : filteredResources.length === 0 ? (
            <EmptyState
              title="No facilities found"
              description="Try adjusting filters or register a new facility."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-electric-300 dark:hover:border-electric-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-electric-50 dark:bg-electric-950 text-electric-700 dark:text-electric-300 border border-electric-200 dark:border-electric-800">
                          {res.type}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                          {res.name}
                        </h3>
                      </div>
                      <Badge status={res.status}>{res.status}</Badge>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <span>Capacity: {res.capacity} Students / Workstations</span>
                      </div>
                      <p className="text-[11px] text-electric-600 dark:text-electric-400 font-medium">
                        Dedicated: {res.dedicatedFor}
                      </p>
                    </div>

                    {/* Features Badges */}
                    <div className="pt-2 border-t border-slate-100 dark:border-midnight-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Equipment & Highlights:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {res.features?.map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-midnight-800 text-slate-600 dark:text-slate-300"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Mgr: {res.manager || 'CSIT Office'}
                    </span>
                    {isHod && (
                      <button
                        onClick={() => setEditingResource(res)}
                        className="px-2.5 py-1 text-xs font-bold text-electric-600 dark:text-electric-400 hover:bg-electric-50 dark:hover:bg-electric-950/60 rounded-lg flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Facility</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Booking Requests Table */
        <div className="bg-white dark:bg-midnight-900 rounded-3xl border border-slate-200/90 dark:border-midnight-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Resource Booking Requests
              </h3>
              <p className="text-xs text-slate-500">
                CSIT 3rd Year / 5th Sem lab sessions, extra classes, and project presentations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-midnight-800 bg-offwhite dark:bg-midnight-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Date & Time Slot</th>
                  <th className="py-3 px-4">Academic Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  {isHod && <th className="py-3 px-4 text-right">HOD Approval</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-midnight-800">
                {bookings.map((bkg) => (
                  <tr key={bkg.id} className="hover:bg-offwhite dark:hover:bg-midnight-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {bkg.resourceName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {bkg.requestedByName}
                    </td>
                    <td className="py-3 px-4 font-bold text-electric-600 dark:text-electric-400">
                      {bkg.section}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div>{bkg.date}</div>
                      <span className="text-[10px] text-slate-400">{bkg.timeSlot}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {bkg.purpose}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={bkg.status}>{bkg.status}</Badge>
                    </td>
                    {isHod && (
                      <td className="py-3 px-4 text-right">
                        {bkg.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setReviewingBooking(bkg);
                                setDecisionNotes('Approved. Room reserved for 5th Sem CSIT.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setReviewingBooking(bkg);
                                setDecisionNotes('Collision with scheduled lab or maintenance.');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {bkg.approvedBy ? `By ${bkg.approvedBy}` : 'Processed'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Resource */}
      <Modal
        isOpen={isAddResourceModalOpen}
        onClose={() => setIsAddResourceModalOpen(false)}
        title="Add Department Resource"
        subtitle="Register new facility for CSIT 3rd Year / 5th Sem usage"
      >
        <ResourceForm
          onSubmit={handleCreateResource}
          onCancel={() => setIsAddResourceModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: Edit Resource */}
      <Modal
        isOpen={Boolean(editingResource)}
        onClose={() => setEditingResource(null)}
        title="Edit Facility Details"
        subtitle={editingResource?.name}
      >
        {editingResource && (
          <ResourceForm
            initialData={editingResource}
            onSubmit={handleUpdateResource}
            onCancel={() => setEditingResource(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Modal: Booking Request */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Request Resource Booking"
        subtitle="Reserve CSIT Smart Classrooms, Laboratories or Projector"
      >
        <BookingForm
          resourceList={resources}
          user={user}
          onSubmit={handleCreateBooking}
          onCancel={() => setIsBookingModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Modal: Review Booking (HOD) */}
      <Modal
        isOpen={Boolean(reviewingBooking)}
        onClose={() => setReviewingBooking(null)}
        title="Review Facility Booking Request"
        subtitle={reviewingBooking?.resourceName}
      >
        {reviewingBooking && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 space-y-1">
              <p><strong>Faculty:</strong> {reviewingBooking.requestedByName}</p>
              <p><strong>Section:</strong> {reviewingBooking.section}</p>
              <p><strong>Date & Time:</strong> {reviewingBooking.date} • {reviewingBooking.timeSlot}</p>
              <p><strong>Purpose:</strong> {reviewingBooking.purpose}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Approval Notes / Instructions
              </label>
              <input
                type="text"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-offwhite dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-midnight-800 flex justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReviewBooking('Rejected')}
                isLoading={isSubmitting}
              >
                Reject Request
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleReviewBooking('Approved')}
                isLoading={isSubmitting}
              >
                Approve Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

