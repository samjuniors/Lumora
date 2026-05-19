import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSound } from "../hooks/useSound";
import { 
  useAssignment, 
  useStudentEnrollments, 
  useStudentSubmissions,
  useAssignmentSubmissions,
  useAssignmentEnrollments,
  useEnrollMutation,
  useSubmissionMutation,
  assignmentKeys,
  submissionKeys
} from '../hooks/queries/useAssignments';
import { queryClient } from '../lib/queryClient';
import { 
  userService, 
  assignmentService,
  walletService,
  submissionService,
  storageService
} from "../services/dbProvider";
import { handleFirestoreError, OperationType } from "../lib/errorHandling";
import { Assignment, Submission, Enrollment, Attachment } from "../types";
import { assessSubmission } from "../services/aiService";
import {
  Bot,
  FileText,
  ArrowLeft,
  Send,
  Upload,
  Paperclip,
  X,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Lock,
  Clock,
  Calendar,
  CheckCircle,
  ShieldAlert,
  Zap,
  Sparkles,
  Shield,
  Edit,
  Gem,
  Target,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "react-confetti";
import { ExpandableText } from "../components/ExpandableText";
import { ProgressBar, Card, Button } from "../components/CommonUI";
import { AssignmentDetailSkeleton } from "../components/Skeletons";

// Note: we're using base64 for simplicity in prototype due to Firebase Storage Rules constraint
// In production, upload to Storage and use Firebase Functions + Vertex AI for larger max payload.

export const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateResources, setUser, isStudent, isAdmin } = useAuth();
  const { playSound } = useSound();

  // Queries
  const { data: assignment, isLoading: isAssignmentLoading } = useAssignment(id || '');
  const { data: studentEnrollments = [], isLoading: isEnrollmentsLoading } = useStudentEnrollments(user?.id);
  const { data: studentSubmissions = [], isLoading: isSubmissionsLoading } = useStudentSubmissions(user?.id);
  
  const { data: adminSubmissions = [], isLoading: isAdminSubmissionsLoading } = useAssignmentSubmissions(!isStudent ? id : undefined);
  const { data: adminEnrollments = [], isLoading: isAdminEnrollmentsLoading } = useAssignmentEnrollments(!isStudent ? id : undefined);

  // Derived state
  const enrollment = useMemo(() => {
    if (!isStudent || !studentEnrollments) return null;
    return studentEnrollments.find(e => e.assignmentId === id) || null;
  }, [studentEnrollments, isStudent, id]);

  const submission = useMemo(() => {
    if (!isStudent || !studentSubmissions) return null;
    return studentSubmissions.filter(s => s.assignmentId === id).sort((a,b) => b.submittedAt - a.submittedAt)[0] || null;
  }, [studentSubmissions, isStudent, id]);

  // Mutations
  const enrollMutation = useEnrollMutation();
  const submissionMutation = useSubmissionMutation();

  const [inspectingSubmission, setInspectingSubmission] =
    useState<Submission | null>(null);

  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enrolling, setEnrolling] = useState(false);
  const [isDoubleDown, setIsDoubleDown] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isTimeUp, setIsTimeUp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedDiamonds, setEarnedDiamonds] = useState(0);

  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);

  const loading = isAssignmentLoading || 
                  (isStudent && (isEnrollmentsLoading || isSubmissionsLoading)) ||
                  (!isStudent && (isAdminSubmissionsLoading || isAdminEnrollmentsLoading));

  useEffect(() => {
    if (!loading && submission && isFirstLoad.current) {
      setContent(submission.content || "");
      if (submission.attachments) setAttachments(submission.attachments);
      isFirstLoad.current = false;
    }
  }, [loading, submission]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && enrollment && (!submission || submission.status !== "assessed")) {
        setTabSwitches(prev => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enrollment, submission]);

  useEffect(() => {
    if (tabSwitches === 1) {
      toast.error("Warning: Tab switching is monitored. Please stay on this page during your assessment.", { duration: 5000, icon: '⚠️' });
    } else if (tabSwitches >= 3) {
      toast.error("Multiple tab switches detected! This has been flagged in your submission.", { duration: 5000, icon: '🚨' });
    }
  }, [tabSwitches]);

  useEffect(() => {
    if (pasteCount === 1) {
      toast.error("Copy-pasting is blocked during assessments.", { icon: '⚠️' });
    } else if (pasteCount >= 3) {
      toast.error("Multiple paste actions detected! This will affect your evaluation.", { icon: '🚨' });
    }
  }, [pasteCount]);

  useEffect(() => {
    if (
      !enrollment ||
      (submission && submission.status === "assessed") ||
      ((assignment?.timeLimitMinutes === undefined || assignment?.timeLimitMinutes === 0) && !enrollment?.graceDeadline)
    )
      return;

    const endTime = enrollment.graceDeadline
      ? enrollment.graceDeadline
      : enrollment.enrolledAt + (assignment?.timeLimitMinutes || 0) * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) {
        setIsTimeUp(true);
        setTimeLeftStr("00:00:00");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeftStr(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enrollment, assignment, submission]);

  useEffect(() => {
    if (!loading && !assignment) {
      navigate("/assignments");
    }
  }, [loading, assignment, navigate]);

  const consumeItem = async (itemId: string): Promise<boolean> => {
    if (!user || !user.inventory || !user.inventory.includes(itemId))
      return false;

    try {
      const newInventory = [...user.inventory];
      const index = newInventory.indexOf(itemId);
      newInventory.splice(index, 1);

      await userService.updateUser(user.id, {
        inventory: newInventory,
      });
      // Update local state by reference
      setUser((prev: any) =>
        prev ? { ...prev, inventory: newInventory } : null,
      );
      toast.success(`Used 1 ${itemId.replace(/_/g, " ")}!`);
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`);
      return false;
    }
  };

  const handleEnroll = async () => {
    if (!assignment || !user) return;
    const isLateToEnroll = Date.now() > assignment.dueDate;

    let consumedLatePass = false;
    if (isLateToEnroll && user.inventory?.includes("late_pass_1")) {
      consumedLatePass = await consumeItem("late_pass_1");
    }

    const baseFee = isDoubleDown ? assignment.entryFee * 2 : assignment.entryFee;
    const totalFee =
      baseFee + (isLateToEnroll && !consumedLatePass ? 30 : 0);

    let feeMessage = `It will cost ${baseFee} coins to take this mission.`;
    if (isDoubleDown) {
        feeMessage = `HIGH STAKES: It will cost ${baseFee} coins (DOUBLE) to take this mission.`;
    }
    if (isLateToEnroll && !consumedLatePass) {
        feeMessage += ` PLUS a 30 coin late fee. Total: ${totalFee} coins.`;
    }

    if (totalFee > 0 && !window.confirm(`${feeMessage} Are you sure you want to enroll?`)) {
        return;
    }

    if (user.coins < totalFee) {
      toast.error(
        `You need ${totalFee} coins to enroll. You have ${user.coins}.`,
      );
      return;
    }

    setEnrolling(true);
    try {
      if (totalFee > 0) {
        await userService.updateUser(user.id, {
          coins: user.coins - totalFee,
          updatedAt: Date.now()
        });

        await walletService.createTransaction({
          senderId: user.id,
          receiverId: "SYSTEM",
          amount: totalFee,
          type:
            isLateToEnroll && !consumedLatePass
              ? "late_enrollment_fee"
              : (isDoubleDown ? "spend" : "enrollment_fee"),
          status: "completed",
          message: isDoubleDown ? "High-Stakes Double Down Enrollment" : undefined,
          timestamp: Date.now(),
        });
      }

      const newEnroll: Omit<Enrollment, 'id'> = {
        assignmentId: assignment.id,
        studentId: user.id,
        enrolledAt: Date.now(),
        status: isLateToEnroll ? "missed" : "active",
        isDoubleDown: isDoubleDown,
        stakedAmount: totalFee,
        updatedAt: Date.now(),
      };
      
      await enrollMutation.mutateAsync(newEnroll);
      
      if (totalFee > 0) {
        updateResources({ coins: user.coins - totalFee });
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `enrollments/${user.id}`);
    } finally {
      setEnrolling(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith("image/");
      return storageService.validateFile(file, {
        maxSize: isImage ? 5 * 1024 * 1024 : 500 * 1024,
        allowedTypes: isImage ? ['image/*'] : ['application/pdf', 'video/*']
      });
    });

    setPendingFiles(prev => [...prev, ...newFiles]);
    
    // For immediate UI feedback, we can show placeholders or local previews if we wanted, 
    // but for now let's just show the file names in the list.
    const newAttachments: Attachment[] = newFiles.map(file => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file) // temporary local URL for preview
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    const attToRemove = attachments[index];
    if (attToRemove.url.startsWith('blob:')) {
       URL.revokeObjectURL(attToRemove.url);
    }
    
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    // Also remove from pending if it was there
    const fileName = attToRemove.name;
    setPendingFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const handleSubmit = async () => {
    if (
      (!content.trim() && attachments.length === 0) ||
      !assignment ||
      !enrollment
    )
      return;
      
    // Check late submission
    const isLate = enrollment?.graceDeadline
      ? Date.now() > enrollment.graceDeadline
      : Date.now() > assignment.dueDate;

    let consumedLatePass = false;
    if (isLate) {
      if (user?.inventory?.includes("late_pass_1")) {
        consumedLatePass = await consumeItem("late_pass_1");
      }
      
      if (!consumedLatePass) {
        if (user!.coins < 30) {
          toast.error("You need 30 coins for late submission fee.");
          return;
        }

        if (!window.confirm("Submitting late will cost a 30 coin late fee. Do you want to proceed?")) {
            return;
        }
        
        // deduct 30 coins
        await userService.updateUser(user!.id, {
          coins: user!.coins - 30,
          updatedAt: Date.now()
        });
        
        await walletService.createTransaction({
          senderId: user!.id,
          receiverId: "SYSTEM",
          amount: 30,
          type: "penalty",
          status: "completed",
          message: `Late Submission Fee for ${assignment.title}`,
          timestamp: Date.now()
        });
        
        // update local state roughly so UI doesn't stutter
        setUser((prev: any) => prev ? { ...prev, coins: prev.coins - 30 } : null);
        toast("🪙 30 coins deducted for late submission.", { icon: "💸" });
      }
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      // 1. Upload pending files
      let finalAttachments = attachments.filter(a => !a.url.startsWith('blob:'));
      if (pendingFiles.length > 0) {
        const uploaded = await storageService.uploadAttachments(
          pendingFiles, 
          `submissions/${user!.id}/${assignment.id}`,
          (progress) => setUploadProgress(progress)
        );
        finalAttachments = [...finalAttachments, ...uploaded];
      }

      // 2. Assess with AI
      const { score, feedback } = await assessSubmission(
        assignment.description,
        assignment.instructions || "",
        content,
        finalAttachments,
        assignment.rubric,
      );

      const subData: Omit<Submission, 'id'> = {
        assignmentId: assignment.id,
        studentId: user!.id,
        content,
        attachments: finalAttachments,
        aiScore: score,
        aiFeedback: typeof feedback === 'string' ? feedback : (feedback as any).overallFeedback || "",
        feedback: typeof feedback === 'object' ? (feedback as any) : undefined,
        status: "pending_review",
        tabSwitches,
        pasteCount,
        submittedAt: submission?.submittedAt || Date.now(),
        updatedAt: Date.now(),
      };

      await submissionMutation.mutateAsync({
        id: submission?.id,
        ...subData
      });

      // Also update enrollment status
      await assignmentService.updateEnrollment(enrollment.id, {
        status: "submitted",
        updatedAt: Date.now()
      });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.enrollments(user!.id) });

      playSound('click');
      toast.success("Assignment submitted for review! A Super Admin will verify it shortly.", { icon: '⏳' });
      
      setShowCompletionMessage(true);
      setTimeout(() => setShowCompletionMessage(false), 8000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `submissions/${assignment.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReevaluate = async () => {
    if (!submission || !assignment) return;
    const consumed = await consumeItem("reevaluation_pass");
    if (!consumed) return;

    setSubmitting(true);
    try {
      const { score, feedback } = await assessSubmission(
        assignment.description,
        assignment.instructions || "",
        submission.content,
        submission.attachments || [],
        assignment.rubric,
      );

      const updatedSub: Submission = {
        ...submission,
        aiScore: score,
        aiFeedback: feedback,
        updatedAt: Date.now(),
      };

      await submissionService.updateSubmission(submission.id, {
        aiScore: score,
        aiFeedback: feedback,
        updatedAt: Date.now(),
      });
      
      queryClient.invalidateQueries({ queryKey: submissionKeys.byStudent(user!.id) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.byAssignment(assignment.id) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submission.id) });

      playSound('success');
      toast.success("Re-evaluated successfully!");
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `submissions/${submission.id}/reevaluate`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!submission || !enrollment) return;

    let consumed = false;
    if (user?.inventory?.includes("resubmission_ticket")) {
      consumed = await consumeItem("resubmission_ticket");
    } else if (user?.inventory?.includes("test_retake_pass")) {
      consumed = await consumeItem("test_retake_pass");
    }

    if (!consumed) return;

    setSubmitting(true);
    try {
      await submissionService.deleteSubmission(submission.id);
      const newGraceDeadline = Math.max(Date.now() + 24 * 60 * 60 * 1000, enrollment.graceDeadline || 0);
      await assignmentService.updateEnrollment(enrollment.id, {
        status: "active",
        graceDeadline: newGraceDeadline,
        updatedAt: Date.now()
      });
      
      queryClient.invalidateQueries({ queryKey: submissionKeys.byStudent(user!.id) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.enrollments(user!.id) });
      
      isFirstLoad.current = true; // Allow re-loading content from scratch if needed (though it was deleted)
      setContent("");
      setAttachments([]);
      toast.success("Submission cleared! You have 24 hours to re-submit without late penalties.");
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `submissions/${submission.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePracticalExemption = async () => {
    if (!assignment || !enrollment) return;
    const consumed = await consumeItem("practical_pass");
    if (!consumed) return;

    setSubmitting(true);
    try {
      const subData: Omit<Submission, 'id'> = {
        assignmentId: assignment.id,
        studentId: user!.id,
        content: "[Practical Exemption Used]",
        attachments: [],
        aiScore: 80,
        aiFeedback:
          "Student used a Practical Exemption Pass. This submission is marked for automatic 80% baseline score upon Admin approval.",
        status: "pending_review",
        tabSwitches: 0,
        pasteCount: 0,
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newSubId = await submissionService.createSubmission(subData);
      
      await assignmentService.updateEnrollment(enrollment.id, {
        status: "submitted",
        updatedAt: Date.now()
      });
      
      queryClient.invalidateQueries({ queryKey: submissionKeys.byStudent(user!.id) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.enrollments(user!.id) });

      playSound('click');
      toast.success("Practical Pass used! Awaiting Admin approval.");
      setShowCompletionMessage(true);
      setTimeout(() => setShowCompletionMessage(false), 8000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `submissions/practical_pass`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-8 px-4 md:px-0">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AssignmentDetailSkeleton />
          </motion.div>
        ) : !assignment ? (
          <motion.div
            key="not-found"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center text-rose-500 font-bold"
          >
            Mission not found
          </motion.div>
        ) : (
          (() => {
            const isSubmissionLate = enrollment?.graceDeadline
              ? (submission ? submission.submittedAt > enrollment.graceDeadline : Date.now() > enrollment.graceDeadline)
              : (submission ? submission.submittedAt > assignment.dueDate : Date.now() > assignment.dueDate);

            const finalEntryFee = assignment.entryFee * (isDoubleDown ? 2 : 1);
            const finalBonusReward = isDoubleDown ? Math.floor(assignment.bonusReward * 2.5) : assignment.bonusReward;
            const finalPenalty = assignment.penaltyFee * (isDoubleDown ? 2 : 1);

            const hasNotStarted =
              assignment.startDate && Date.now() < assignment.startDate;

            return (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 md:space-y-8"
              >
            <AnimatePresence>
        {showCompletionMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/60 backdrop-blur-sm"
          >
            <Confetti
              width={typeof window !== "undefined" ? window.innerWidth : 1000}
              height={typeof window !== "undefined" ? window.innerHeight : 1000}
              recycle={false}
              numberOfPieces={500}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-bg-surface rounded-[2rem] p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative"
            >
              <button
                onClick={() => setShowCompletionMessage(false)}
                className="absolute top-4 right-4 text-text-secondary/80 hover:text-text-secondary"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div className="w-16 h-16 md:w-20 md:h-20 bg-success-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-text-primary mb-2">
                Mission Accomplished!
              </h2>
               <p className="text-text-secondary text-sm md:text-lg mb-6">
                You've successfully completed the mission and submitted for review.
              </p>

              {(earnedCoins > 0 || earnedXP > 0 || earnedDiamonds > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-bg-main p-4 rounded-2xl border border-border-main">
                  {earnedCoins > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase font-black text-text-secondary mb-1">Coins</span>
                      <div className="text-xl font-black text-brand-gold flex items-center gap-1">
                        <Zap className="w-4 h-4 fill-current" /> {earnedCoins}
                      </div>
                    </div>
                  )}
                   {earnedXP > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase font-black text-text-secondary mb-1">XP Earned</span>
                      <div className="text-xl font-black text-indigo-600 flex items-center gap-1">
                        <Sparkles className="w-4 h-4" /> {earnedXP}
                      </div>
                    </div>
                  )}
                   {earnedDiamonds > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase font-black text-text-secondary mb-1">Diamonds</span>
                      <div className="text-xl font-black text-cyan-500 flex items-center gap-1">
                        <Gem className="w-4 h-4" /> {earnedDiamonds}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-brand-gold/10 p-4 rounded-2xl border border-brand-gold/20">
                   <p className="text-sm font-bold text-amber-800 italic">
                      Mission details saved. Awaiting Final Admin Assessment for rewards!
                   </p>
                </div>
              )}

              <button
                onClick={() => setShowCompletionMessage(false)}
                className="mt-6 w-full py-3 md:py-4 bg-brand-gold-hover text-bg-main rounded-xl font-bold hover:bg-indigo-700 transition"
              >
                View My Results
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => navigate("/assignments")}
        className="flex items-center gap-2 text-text-muted hover:text-brand-gold transition text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.03] border border-white/5 w-fit px-4 py-2 rounded-xl"
      >
        <ArrowLeft size={12} /> Return to Mission Hub
      </button>

      {/* Assignment Header */}
      <Card
        variant="glass"
        className="border-white/[0.03] shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="p-8 md:p-10 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-6">
                {assignment.isBonus && (
                  <span className="bg-brand-gold text-bg-main text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-[0.2em] shadow-lg shadow-brand-gold/20">
                    Classified Directive
                  </span>
                )}
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{assignment.subject || 'Strategic Objective'}</span>
                {isAdmin && (
                  <button 
                    onClick={() => navigate('/assignments', { state: { editId: assignment.id } })}
                    className="flex items-center gap-1.5 text-brand-gold hover:text-white transition font-black text-[10px] uppercase tracking-widest ml-4 px-2 py-1 bg-white/[0.03] rounded-md border border-white/5"
                  >
                    <Edit size={12} /> Console Fix
                  </button>
                )}
              </div>

              <h1 className={cn(
                "text-3xl md:text-5xl font-black tracking-tight mb-6",
                assignment.isBonus ? "text-brand-gold text-glow-gold" : "text-text-primary"
              )}>
                {assignment.title}
              </h1>

              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <Calendar size={14} className="text-brand-gold" />
                  <span>Deadline: {format(assignment.dueDate, "MMM d, HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <span>Stake: <span className="text-brand-gold">🪙 {finalEntryFee}</span></span>
                </div>
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <span>Est. Yield: <span className="text-emerald-500">🪙 {finalBonusReward}</span></span>
                </div>
              </div>

              <div className="text-text-secondary text-sm md:text-base leading-relaxed font-medium max-w-3xl prose prose-invert opacity-80">
                <ExpandableText text={assignment.description} maxLength={300} />
              </div>
            </div>

            <div className="w-full lg:w-72 shrink-0">
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Target size={14} className="text-brand-gold" /> Assessment Criteria
                    </h4>
                    <div className="space-y-3">
                        {assignment.rubric?.map((r, i) => (
                            <div key={i} className="flex flex-col gap-1.5 pb-3 border-b border-white/[0.03] last:border-0 last:pb-0">
                                <div className="flex items-center justify-between gap-3 text-[11px]">
                                    <span className="text-text-primary font-black uppercase tracking-tight">{r.name}</span>
                                    <span className="text-brand-gold font-black tabular-nums">{r.weight}%</span>
                                </div>
                                <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                                   <div className="h-full bg-brand-gold/30" style={{ width: `${r.weight}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </Card>


      {isStudent && !enrollment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-[2.5rem] text-center max-w-xl mx-auto shadow-2xl relative overflow-hidden"
        >
          <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/5">
            <Lock size={28} className="text-text-muted opacity-30" />
          </div>
          <h3 className="text-2xl font-black text-text-primary tracking-tight mb-3">Authorize Operation</h3>
          <p className="text-xs text-text-muted mb-10 leading-relaxed font-black uppercase tracking-[0.2em] opacity-80">
            Strategic Stake Required: <span className="text-brand-gold">🪙 {finalEntryFee}</span>
          </p>

          <div className="mb-10 p-6 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 flex items-center justify-center rounded-xl transition-all border", isDoubleDown ? "bg-rose-500/20 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/20" : "bg-white/5 text-text-muted border-white/5")}>
                   <Zap size={22} className={isDoubleDown ? "fill-current" : ""} />
                </div>
                <div className="text-left space-y-1">
                   <h4 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] leading-none">Double Down</h4>
                   <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-none">High Risk | 2.5x Optimized Yield</p>
                </div>
             </div>
             <button 
               onClick={() => setIsDoubleDown(!isDoubleDown)}
               className={cn("w-12 h-6 rounded-full relative transition-all shadow-inner", isDoubleDown ? "bg-rose-500/40" : "bg-white/10")}
             >
               <motion.div 
                 animate={{ x: isDoubleDown ? 26 : 2 }}
                 className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
               />
             </button>
          </div>

          <div className="space-y-6">
            {hasNotStarted ? (
              <div className="bg-white/[0.03] text-text-muted text-[10px] font-black uppercase tracking-[0.2em] p-5 rounded-2xl flex items-center justify-center gap-3 border border-white/5 italic">
                <Clock size={16} /> Opening Window {format(assignment.startDate!, "MMM d, HH:mm")}
              </div>
            ) : (
                <Button
                    variant={isDoubleDown ? "outline" : "gold"}
                    size="lg"
                    className="w-full font-black text-[10px] uppercase tracking-[0.2em] py-5"
                    onClick={handleEnroll}
                    isLoading={enrolling}
                    disabled={user.coins < finalEntryFee}
                >
                    {enrolling ? "Linking..." : `Authorize Deployment`}
                </Button>
            )}

            {user.coins < finalEntryFee && (
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-4">
                <ShieldAlert size={14} /> Critical Balance Shortfall
              </p>
            )}
          </div>
        </motion.div>
      )}

      {isStudent && enrollment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Editor Area */}
          <Card variant="flat" className="p-8 space-y-8 border-white/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/[0.03] text-brand-gold rounded-2xl flex items-center justify-center border border-white/5">
                    <FileText size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-text-primary tracking-tight">Mission Terminal</h2>
                   <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Live Assessment Active</p>
                </div>
              </div>
              {timeLeftStr && (
                <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 font-mono text-sm font-black tabular-nums shadow-lg shadow-rose-500/5">
                  <Clock size={14} />
                  <span>{timeLeftStr}</span>
                </div>
              )}
            </div>

            <div className="relative group">
               <textarea
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 disabled={submitting || ((submission?.status === "assessed" || submission?.status === "pending_review") && !isEditing) || isTimeUp}
                 className="w-full min-h-[400px] p-6 text-sm border border-white/5 rounded-2xl bg-white/[0.01] text-text-primary focus:border-brand-gold/30 outline-none transition-all resize-none leading-relaxed font-medium placeholder:text-text-muted/30"
                 placeholder="Input submission sequence..."
               />
               <div className="absolute top-4 right-4 pointer-events-none opacity-20">
                  <Bot size={24} className="text-brand-gold" />
               </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Evidence Repository</h4>
                {!submission || (submission.status !== "assessed" && submission.status !== "pending_review") && !isTimeUp && (
                   <div className="flex items-center gap-4">
                      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,video/*" />
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-brand-gold hover:text-white transition uppercase tracking-[0.2em] flex items-center gap-2">
                        <Upload size={12} /> Link Files
                      </button>
                   </div>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl hover:bg-white/[0.04] transition-all">
                      <div className="shrink-0 text-brand-gold">{att.type.startsWith("image") ? <ImageIcon size={16}/> : <FileIcon size={16}/>}</div>
                      <span className="text-[10px] font-black text-text-secondary truncate flex-1 uppercase tracking-tight">{att.name}</span>
                      {!submission || (submission.status !== "assessed" && submission.status !== "pending_review") && !isTimeUp && (
                        <button onClick={() => removeAttachment(idx)} className="text-text-muted hover:text-rose-500 transition-colors"><X size={14}/></button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl text-center">
                   <p className="text-[9px] font-black text-text-muted opacity-30 uppercase tracking-[0.3em]">Vault empty. No evidence linked.</p>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                <ProgressBar progress={uploadProgress} label="Encrypting Payload" className="mb-2" />
              )}
              {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review") || isEditing) && (
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full font-black text-[10px] uppercase tracking-[0.2em] py-5"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  disabled={(!content.trim() && attachments.length === 0) || isTimeUp}
                >
                  {submitting ? "Processing Neural Integrity..." : submission ? "Update Transmission" : "Finalize Transmission"}
                </Button>
              )}
            </div>
          </Card>

          {/* AI Intelligence Report */}
          <Card variant="glass" className="p-8 space-y-8 bg-white/[0.02] border-white/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center border border-brand-gold/20 shadow-lg shadow-brand-gold/10">
                    <Sparkles size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-text-primary tracking-tight">Intelligence Brief</h2>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">Autonomous Analysis Complete</p>
                 </div>
              </div>
            </div>

            {submission?.status === "pending_review" || submission?.status === "assessed" ? (
              <div className="space-y-8">
                <div className="p-12 bg-black/40 border border-white/5 rounded-[2.5rem] text-center relative overflow-hidden shadow-inner flex flex-col items-center justify-center">
                   <div className="absolute inset-0 bg-brand-gold/5 pointer-events-none blur-3xl rounded-full translate-y-1/2" />
                   {submission.status === "pending_review" && (
                     <div className="absolute inset-0 bg-bg-main/60 backdrop-blur-md z-10 flex items-center justify-center p-6 text-center">
                        <div className="space-y-4">
                           <Loader2 size={32} className="text-brand-gold animate-spin mx-auto" />
                           <div className="space-y-1">
                              <p className="text-[11px] font-black text-brand-gold uppercase tracking-[0.3em] leading-none">Security Audit In Progress</p>
                              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-none">Verifying Neural Pattern Consistency</p>
                           </div>
                        </div>
                     </div>
                   )}
                   <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-4 opacity-50 font-mono">Performance Metric</p>
                   <div className={cn(
                     "text-7xl md:text-8xl font-black text-brand-gold tabular-nums leading-none tracking-tighter flex items-baseline gap-1",
                     submission.aiScore >= 80 ? "text-emerald-500" : submission.aiScore >= 50 ? "text-brand-gold" : "text-rose-500"
                   )}>
                      {submission.aiScore}<span className="text-3xl text-text-muted opacity-20 ml-1">/100</span>
                   </div>
                </div>

                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden shadow-inner">
                   <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Dossier Summary</p>
                   </div>
                   <ExpandableText maxHeight={250}>
                      <div className="markdown-body text-sm text-text-secondary leading-relaxed font-medium italic opacity-80 pl-2 border-l border-brand-gold/20">
                        <Markdown>{submission.aiFeedback || ""}</Markdown>
                      </div>
                   </ExpandableText>
                </div>

                {submission.status === "assessed" && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 pt-6 border-t border-white/5">
                     <div className="flex items-center gap-6">
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none">Economic Yield</p>
                           <p className="text-lg font-black text-emerald-500 tabular-nums leading-none">🪙 {submission.calculatedReward || 0}</p>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="space-y-1">
                           <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none">Net Penalties</p>
                           <p className="text-lg font-black text-rose-500 tabular-nums leading-none">🪙 {submission.penaltyAmount || 0}</p>
                        </div>
                     </div>

                     {enrollment?.graceDeadline && Date.now() < enrollment.graceDeadline && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit}
                          onClick={() => {
                            setIsEditing(true);
                            toast.success("Editor re-initialized during grace window.", { icon: '🔓' });
                          }}
                          className="font-black text-[9px] uppercase tracking-widest border border-white/5 px-4"
                        >
                          Modify Deployment
                        </Button>
                     )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                   {user?.inventory?.includes("reevaluation_pass") && (
                     <Button 
                        variant="ghost" 
                        size="md" 
                        icon={Sparkles}
                        onClick={handleReevaluate} 
                        className="w-full text-brand-gold bg-brand-gold/5 border-brand-gold/10 font-black text-[10px] py-4"
                     >
                        Request Neural Re-Scan
                     </Button>
                   )}
                   {(user?.inventory?.includes("resubmission_ticket") || user?.inventory?.includes("test_retake_pass")) && (
                     <Button 
                        variant="ghost" 
                        size="md" 
                        icon={Zap}
                        onClick={handleResubmit} 
                        className="w-full text-emerald-500 bg-emerald-500/5 border-emerald-500/10 font-black text-[10px] py-4"
                     >
                        Force Payload Purge
                     </Button>
                   )}
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-10 bg-black/20 rounded-[2.5rem] border border-dashed border-white/5">
                <div className="w-20 h-20 bg-white/[0.02] rounded-full flex items-center justify-center mb-8 text-text-muted/20 shadow-inner">
                  <Bot size={40} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] mb-4">Neural Buffer Empty</h3>
                <p className="text-[11px] text-text-muted max-w-xs leading-relaxed italic font-medium opacity-60">
                  Assessment intelligence will initialize upon successful transmission of mission directives. Encryption keys pending.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}



      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-surface rounded-[2.5rem] border border-border-main shadow-xl shadow-black/5/50 p-8 md:p-10"
        >
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-black text-text-primary">
              Cohort Roster{" "}
              <span className="text-brand-gold">
                ({adminEnrollments.length})
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-100 border-t border-border-main">
            {adminEnrollments.length === 0 && (
              <p className="text-center py-12 text-text-secondary font-bold text-lg">
                No active enrollments
              </p>
            )}
            {adminEnrollments.map((enr) => {
              const sub = adminSubmissions.find(
                (s) => s.studentId === enr.studentId,
              );
              const late = sub
                ? sub.submittedAt > assignment.dueDate
                : Date.now() > assignment.dueDate;

              return (
                <div
                  key={enr.id}
                  className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-bg-main/50 px-4 -mx-4 rounded-2xl transition"
                >
                  <div>
                    <p className="font-bold text-text-primary text-lg mb-1">
                      UID: {enr.studentId}
                    </p>
                    <p className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Enrolled:{" "}
                      {format(enr.enrolledAt, "PPp")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {sub ? (
                      <div className="flex items-center gap-6">
                        <div className="text-right flex items-center justify-end gap-3">
                          {((sub.tabSwitches && sub.tabSwitches > 0) || (sub.pasteCount && sub.pasteCount > 0)) && (
                            <div className="bg-rose-500/20 p-2 rounded-lg text-rose-500" title="Activity Tracking Filters Triggered">
                              <ShieldAlert className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex flex-col items-end">
                            {late && (
                              <span className="text-xs text-rose-500 font-black uppercase tracking-widest block mb-1">
                                Late Submission
                              </span>
                            )}
                          <span
                            className={cn(
                              "text-2xl font-black",
                              sub.aiScore >= 80
                                ? "text-emerald-500"
                                : "text-amber-500",
                            )}
                          >
                            {sub.aiScore}
                            <span className="text-sm font-bold text-text-secondary/80">
                              /100
                            </span>
                          </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setInspectingSubmission(sub)}
                          className="bg-brand-gold-hover text-bg-main px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-sm"
                        >
                          Inspect
                        </button>
                      </div>
                    ) : (
                      <div className="text-right px-4 py-2 rounded-xl bg-bg-main border border-border-main">
                        {late ? (
                          <span className="text-rose-600 font-bold text-sm uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4" /> Penalty Applied
                          </span>
                        ) : (
                          <span className="text-brand-gold font-bold text-sm uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> Pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {inspectingSubmission && (
        <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-bg-surface rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
          >
            <div className="flex items-center justify-between p-6 border-b border-border-main bg-bg-main/50">
              <h3 className="font-bold text-xl text-text-primary flex items-center gap-3">
                <Bot className="w-6 h-6 text-brand-gold" />
                Submission Inspection
              </h3>
              <button
                onClick={() => setInspectingSubmission(null)}
                className="p-2 hover:bg-border-main rounded-full text-text-secondary hover:text-text-primary transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-8 border-b border-border-main/50">
              <div className="mb-8">
                <h4 className="text-sm font-black text-text-secondary mb-4 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Student Content
                </h4>
                <div className="bg-bg-main text-text-primary p-6 rounded-2xl whitespace-pre-wrap font-medium leading-relaxed border border-border-main shadow-inner">
                  {inspectingSubmission.content}
                </div>
              </div>

              {((inspectingSubmission.tabSwitches && inspectingSubmission.tabSwitches > 0) || (inspectingSubmission.pasteCount && inspectingSubmission.pasteCount > 0)) && (
                <div className="mb-8 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-left flex gap-3 text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-800 mb-1">Activity Tracking Flags</p>
                    <ul className="list-disc leading-relaxed text-rose-700 ml-4">
                      {inspectingSubmission.tabSwitches && inspectingSubmission.tabSwitches > 0 && <li>Tab switched {inspectingSubmission.tabSwitches} times during assessment.</li>}
                      {inspectingSubmission.pasteCount && inspectingSubmission.pasteCount > 0 && <li>Copy-pasted content {inspectingSubmission.pasteCount} times.</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-black text-brand-gold mb-4 uppercase tracking-widest flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Strategic Assessment
                </h4>
                
                {inspectingSubmission.feedback ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {inspectingSubmission.feedback.rubricFeedback.map((rf: any, i: number) => (
                        <div key={i} className="p-4 bg-navy-950 border border-navy-800 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{rf.criterion}</h5>
                            <span className="text-[11px] font-black text-brand-gold">{rf.score}%</span>
                          </div>
                          <p className="text-xs text-text-primary leading-relaxed">{rf.feedback}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-navy-950 border border-brand-gold/10 rounded-xl italic text-sm text-text-primary">
                      {inspectingSubmission.feedback.overallFeedback}
                    </div>
                  </div>
                ) : (
                  <div className="markdown-body text-sm">
                    <Markdown>{inspectingSubmission.aiFeedback}</Markdown>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-bg-main flex items-center justify-between">
              <span className="font-bold text-text-secondary/80">
                UID:{" "}
                <span className="font-mono text-text-secondary">
                  {inspectingSubmission.studentId}
                </span>
              </span>
              <div className="bg-bg-surface px-6 py-3 rounded-2xl font-black text-xl border border-border-main shadow-sm">
                Score:{" "}
                <span
                  className={cn(
                    inspectingSubmission.aiScore >= 80
                      ? "text-emerald-500"
                      : "text-amber-500",
                  )}
                >
                  {inspectingSubmission.aiScore}
                </span>
                <span className="text-text-secondary/60">/100</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
            </motion.div>
          );
        })())}
      </AnimatePresence>
    </div>
  );
};
