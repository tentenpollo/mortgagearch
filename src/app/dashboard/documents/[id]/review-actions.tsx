"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Textarea } from "@/components/ui";
import { CheckCircle, XCircle } from "lucide-react";
import {
  approveDocumentAction,
  rejectDocumentAction,
  changeReviewAction,
} from "@/app/actions/documents.actions";

interface ReviewActionsProps {
  documentId: string;
  status: string;
  reviewDecision: string | null;
  reviewedAt: Date | null;
}

export function ReviewActions({
  documentId,
  status,
  reviewDecision,
  reviewedAt,
}: ReviewActionsProps) {
  const router = useRouter();
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeDecision, setChangeDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPendingReview = status === "PENDING_REVIEW";
  const isReviewed = reviewedAt !== null;

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await approveDocumentAction(documentId, formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsApproveModalOpen(false);
      router.refresh();
    }
  };

  const handleReject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await rejectDocumentAction(documentId, formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsRejectModalOpen(false);
      router.refresh();
    }
  };

  const handleChangeReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await changeReviewAction(documentId, changeDecision, formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsChangeModalOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      {isPendingReview && (
        <div className="flex gap-3">
          <Button
            onClick={() => setIsApproveModalOpen(true)}
            variant="primary"
            size="md"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            onClick={() => setIsRejectModalOpen(true)}
            variant="danger"
            size="md"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}

      {isReviewed && (
        <Button
          onClick={() => setIsChangeModalOpen(true)}
          variant="secondary"
          size="sm"
        >
          Change Review Decision
        </Button>
      )}

      {/* Approve Modal */}
      <Modal
        open={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setError(null);
        }}
        title="Approve Document"
      >
        <form onSubmit={handleApprove} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <Textarea
            label="Notes (optional)"
            name="notes"
            placeholder="Add any notes about this approval..."
            rows={3}
          />

          <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 border border-green-200">
            This document will be marked as approved and the client will be notified.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsApproveModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setError(null);
        }}
        title="Reject Document"
      >
        <form onSubmit={handleReject} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <Textarea
            label="Rejection Reason"
            name="reason"
            placeholder="Please explain why this document is being rejected..."
            rows={4}
            required
          />

          <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 border border-amber-200">
            This document will be marked as rejected. The client can re-upload a corrected version.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRejectModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={isSubmitting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Review Modal */}
      <Modal
        open={isChangeModalOpen}
        onClose={() => {
          setIsChangeModalOpen(false);
          setError(null);
        }}
        title="Change Review Decision"
      >
        <form onSubmit={handleChangeReview} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              New Decision
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChangeDecision("APPROVED")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  changeDecision === "APPROVED"
                    ? "border-green-500 bg-green-50 text-green-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setChangeDecision("REJECTED")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  changeDecision === "REJECTED"
                    ? "border-red-500 bg-red-50 text-red-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <XCircle className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Reject</span>
              </button>
            </div>
          </div>

          {changeDecision === "APPROVED" ? (
            <Textarea
              label="Notes (optional)"
              name="notes"
              placeholder="Add any notes about this approval..."
              rows={3}
            />
          ) : (
            <Textarea
              label="Rejection Reason"
              name="reason"
              placeholder="Please explain why this document is being rejected..."
              rows={4}
              required
            />
          )}

          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 border border-blue-200">
            This change will be logged in the audit trail.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsChangeModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={changeDecision === "APPROVED" ? "primary" : "danger"}
              loading={isSubmitting}
            >
              Change to {changeDecision === "APPROVED" ? "Approved" : "Rejected"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
