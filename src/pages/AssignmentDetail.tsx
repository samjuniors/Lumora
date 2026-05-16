import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSound } from "../hooks/useSound";
import { dbService } from "../services/dbProvider";
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
// Note: we're using base64 for simplicity in prototype due to Firebase Storage Rules constraint
// In production, upload to Storage and use Firebase Functions + Vertex AI for larger max payload.

export const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateResources, setUser } = useAuth();
  const { playSound } = useSound();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [adminSubmissions, setAdminSubmissions] = useState<Submission[]>([]);
  const [adminEnrollments, setAdminEnrollments] = useState<Enrollment[]>([]);
  const [inspectingSubmission, setInspectingSubmission] =
    useState<Submission | null>(null);

  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDoubleDown, setIsDoubleDown] = useState(false);

  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isTimeUp, setIsTimeUp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedDiamonds, setEarnedDiamonds] = useState(0);

  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);

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
      : enrollment.enrolledAt + assignment.timeLimitMinutes * 60 * 1000;

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
    fetchData();
  }, [id, user?.id, user?.role]);

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      const ass = await dbService.getAssignment(id);
      if (ass)
        setAssignment(ass);
      else {
        navigate("/assignments");
        return;
      }

      if (user.role === "student") {
        const enrollments = await dbService.getEnrollmentsByStudent(user.id);
        const enr = enrollments.find(e => e.assignmentId === id);
        if (enr) {
          setEnrollment(enr);
        }

        const subs = await dbService.getSubmissionsByStudent(user.id);
        const sub = subs.filter(s => s.assignmentId === id).sort((a,b) => b.submittedAt - a.submittedAt)[0];
        if (sub) {
          setSubmission(sub);
          setContent(sub.content);
          if (sub.attachments) setAttachments(sub.attachments);
        }
      } else {
        const allEnrollments = await dbService.getAllEnrollments();
        setAdminEnrollments(allEnrollments.filter(e => e.assignmentId === id));

        const allSubs = await dbService.getSubmissionsByAssignment(id);
        setAdminSubmissions(allSubs);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `assignment_detail_${id}`);
    } finally {
      setLoading(false);
    }
  };

  const consumeItem = async (itemId: string): Promise<boolean> => {
    if (!user || !user.inventory || !user.inventory.includes(itemId))
      return false;

    try {
      const newInventory = [...user.inventory];
      const index = newInventory.indexOf(itemId);
      newInventory.splice(index, 1);

      await dbService.updateUser(user.id, {
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
        await dbService.updateUser(user.id, {
          coins: user.coins - totalFee,
          updatedAt: Date.now()
        });

        await dbService.createTransaction({
          senderId: user.id,
          receiverId: "SYSTEM",
          amount: totalFee,
          type:
            isLateToEnroll && !consumedLatePass
              ? "late_enrollment_fee"
              : (isDoubleDown ? "spend" : "enrollment_fee"), // Use spend for double down for now or add new type
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
      
      const enrollId = await dbService.createEnrollment(newEnroll);
      const fullEnroll = { id: enrollId, ...newEnroll };
      
      if (totalFee > 0) {
        updateResources({ coins: user.coins - totalFee });
      }
      setEnrollment(fullEnroll);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `enrollments/${user.id}`);
    } finally {
      setEnrolling(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const isImage = file.type.startsWith("image/");
      if (!isImage && file.size > 500 * 1024) {
        toast.error(`${file.name} is too large. Max 500KB for non-images.`);
        return;
      }
      if (isImage && file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB for images.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          if (isImage) {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let w = img.width;
              let h = img.height;
              const maxD = 1200;
              if (w > maxD || h > maxD) {
                if (w > h) { h = Math.round((h * maxD) / w); w = maxD; }
                else { w = Math.round((w * maxD) / h); h = maxD; }
              }
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0, w, h);
              const compressedResult = canvas.toDataURL("image/jpeg", 0.6);
              setAttachments((prev) => [
                ...prev,
                { name: file.name, type: "image/jpeg", url: compressedResult },
              ]);
            };
            img.src = result;
          } else {
            setAttachments((prev) => [
              ...prev,
              { name: file.name, type: file.type, url: result },
            ]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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
        await dbService.updateUser(user!.id, {
          coins: user!.coins - 30,
          updatedAt: Date.now()
        });
        
        await dbService.createTransaction({
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
    try {
      const { score, feedback } = await assessSubmission(
        assignment.description,
        assignment.instructions || "",
        content,
        attachments,
        assignment.rubric,
      );

      let finalAttachments = attachments;
      let totalSizeStr = finalAttachments.reduce((sum, att) => sum + (att.url?.length || 0), 0);
      if (totalSizeStr > 800 * 1024) {
        finalAttachments = finalAttachments.map(att => {
          if (att.url.length > 200 * 1024) {
             return { ...att, url: "[Attachment too large to save. Preview omitted.]" };
          }
          return att;
        });
      }

      const subData: Omit<Submission, 'id'> = {
        assignmentId: assignment.id,
        studentId: user!.id,
        content,
        attachments: finalAttachments,
        aiScore: score,
        aiFeedback: feedback,
        status: "pending_review",
        tabSwitches,
        pasteCount,
        submittedAt: submission?.submittedAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (submission?.id) {
          await dbService.updateSubmission(submission.id, subData);
          setSubmission({ id: submission.id, ...subData });
      } else {
          const newSubId = await dbService.createSubmission(subData);
          setSubmission({ id: newSubId, ...subData });
      }

      await dbService.updateEnrollment(enrollment.id, {
        status: "submitted",
        updatedAt: Date.now()
      });
      setEnrollment((prev) => (prev ? { ...prev, status: "submitted" } : null));

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

      await dbService.updateSubmission(submission.id, {
        aiScore: score,
        aiFeedback: feedback,
        updatedAt: Date.now(),
      });
      setSubmission(updatedSub);

      // Optionally give reward again if score jumped to >= 50, but let's keep it simple.
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
      await dbService.deleteSubmission(submission.id);
      const newGraceDeadline = Math.max(Date.now() + 24 * 60 * 60 * 1000, enrollment.graceDeadline || 0);
      await dbService.updateEnrollment(enrollment.id, {
        status: "active",
        graceDeadline: newGraceDeadline,
        updatedAt: Date.now()
      });
      setSubmission(null);
      setEnrollment(prev => prev ? { ...prev, status: "active", graceDeadline: newGraceDeadline } : null);
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

      const newSubId = await dbService.createSubmission(subData);
      setSubmission({ id: newSubId, ...subData });

      await dbService.updateEnrollment(enrollment.id, {
        status: "submitted",
        updatedAt: Date.now()
      });
      setEnrollment((prev) => (prev ? { ...prev, status: "submitted" } : null));

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

  if (loading)
    return (
      <div className="p-12 text-center text-text-secondary font-bold animate-pulse">
        Loading Mission Data...
      </div>
    );
  if (!assignment)
    return (
      <div className="p-12 text-center text-rose-500 font-bold">
        Mission not found
      </div>
    );

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-4 md:space-y-8"
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
        className="flex items-center gap-2 text-brand-gold hover:text-white transition text-xs font-bold uppercase tracking-widest bg-navy-900 border border-navy-700 w-fit px-4 py-2 rounded-xl"
      >
        <ArrowLeft size={14} /> Back to Missions
      </button>

      {/* Assignment Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className={cn(
          "bg-navy-900 rounded-[2.5rem] border border-brand-gold/20 shadow-glow-gold overflow-hidden relative",
          assignment.isBonus && "ring-1 ring-brand-gold/40"
        )}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="p-8 md:p-12 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-5">
                {assignment.isBonus && (
                  <span className="bg-brand-gold text-navy-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest shadow-glow-gold">
                    Special Operation
                  </span>
                )}
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <button 
                    onClick={() => navigate('/assignments', { state: { editId: assignment.id } })}
                    className="flex items-center gap-1.5 text-brand-gold hover:text-white transition font-bold text-[10px] uppercase tracking-wider"
                  >
                    <Edit size={12} /> Configure Template
                  </button>
                )}
              </div>

              <h1 className={cn(
                "text-3xl md:text-5xl font-display font-bold tracking-tight mb-6",
                assignment.isBonus ? "text-brand-gold" : "text-white"
              )}>
                {assignment.title}
              </h1>

              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 bg-navy-950 border border-navy-700/50 px-4 py-2 rounded-xl text-xs font-medium text-text-muted">
                  <Calendar size={14} className="text-brand-gold" />
                  <span>Due {format(assignment.dueDate, "MMM d, h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 bg-navy-950 border border-navy-700/50 px-4 py-2 rounded-xl text-xs font-medium text-text-muted">
                  <span>Stake: <span className="text-brand-gold font-bold">🪙 {finalEntryFee}</span></span>
                </div>
                <div className="flex items-center gap-2 bg-navy-950 border border-navy-700/50 px-4 py-2 rounded-xl text-xs font-medium text-text-muted">
                  <span>Yield: <span className="text-emerald-400 font-bold">🪙 {finalBonusReward}</span></span>
                </div>
              </div>

              <div className="text-text-muted leading-relaxed max-w-2xl font-medium">
                <ExpandableText text={assignment.description} maxLength={300} />
              </div>
            </div>

            <div className="w-full md:w-72 space-y-4">
                <div className="p-6 bg-navy-950 rounded-[2rem] border border-brand-gold/10 shadow-inner">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Target size={12} className="text-brand-gold" /> Critical Rubric
                    </h4>
                    <div className="space-y-3">
                        {assignment.rubric?.map((r, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                                <span className="text-xs text-white font-medium truncate">{r.name}</span>
                                <span className="text-[11px] font-bold text-brand-gold shrink-0 tabular-nums">{r.weight}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </motion.div>

      {user?.role === "student" && !enrollment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-navy-900 border border-brand-gold/10 p-8 md:p-12 rounded-[2.5rem] text-center max-w-xl mx-auto shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/[0.02] to-transparent pointer-events-none" />
          <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-navy-800 shadow-inner ring-1 ring-white/5">
            <Lock size={32} className="text-text-muted/30" />
          </div>
          <h3 className="text-2xl font-display font-bold text-white tracking-tight mb-3">Initiate Operation</h3>
          <p className="text-sm text-text-muted mb-10 leading-relaxed font-medium">
            This operation requires a strategic commitment of <span className="text-brand-gold font-bold">🪙 {finalEntryFee}</span>.
            Successful completion yields up to <span className="text-emerald-400 font-bold">🪙 {finalBonusReward}</span>.
          </p>

          <div className="mb-10 p-5 bg-navy-950 border border-navy-800 rounded-[2rem] flex items-center justify-between gap-6 shadow-inner">
             <div className="flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl transition-all duration-500", isDoubleDown ? "bg-error text-white shadow-glow-error" : "bg-navy-800 text-text-muted/30")}>
                   <Zap size={20} className={isDoubleDown ? "animate-pulse" : ""} />
                </div>
                <div className="text-left">
                   <h4 className="text-[11px] font-bold text-white uppercase tracking-widest leading-none mb-1.5">Double Down</h4>
                   <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight">2.5x Revenue | 2x Liability</p>
                </div>
             </div>
             <button 
               onClick={() => setIsDoubleDown(!isDoubleDown)}
               className={cn("w-12 h-7 rounded-full relative transition-all duration-300", isDoubleDown ? "bg-error" : "bg-navy-700")}
             >
               <motion.div 
                 animate={{ x: isDoubleDown ? 22 : 4 }}
                 className="absolute top-1.5 w-4 h-4 bg-white rounded-full shadow-md"
               />
             </button>
          </div>

          <div className="space-y-4">
            {hasNotStarted ? (
              <div className="bg-navy-950 text-text-muted text-xs font-bold p-5 rounded-2xl flex items-center justify-center gap-3 border border-navy-800 italic">
                <Clock size={16} /> Operation Commences: {format(assignment.startDate!, "MMM d, h:mm a")}
              </div>
            ) : (
                <button
                onClick={handleEnroll}
                disabled={enrolling || user.coins < finalEntryFee}
                className="w-full bg-brand-gold text-navy-950 py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-glow-gold hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {enrolling ? "Establishing Link..." : `Authorize Deployment • 🪙 ${finalEntryFee}`}
              </button>
            )}

            {user.coins < finalEntryFee && (
              <p className="text-error text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-2">
                <ShieldAlert size={14} /> Intelligence: Insufficient Liquidity
              </p>
            )}
          </div>
        </motion.div>
      )}

      {user?.role === "student" && enrollment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Editor Area */}
          <div className="card-premium p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy-800 text-brand-gold rounded-xl flex items-center justify-center border border-brand-gold/20">
                    <FileText size={20} />
                </div>
                <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">Mission Console</h2>
              </div>
              {timeLeftStr && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-error/10 text-error rounded-lg border border-error/20 font-mono text-sm font-bold">
                  <Clock size={14} />
                  <span>{timeLeftStr}</span>
                </div>
              )}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting || submission?.status === "assessed" || submission?.status === "pending_review" || isTimeUp}
              className="w-full min-h-[350px] p-5 text-sm md:text-base border border-navy-700 rounded-xl bg-navy-900 text-text-primary focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all resize-none shadow-inner leading-relaxed font-medium"
              placeholder="Inject assessment response..."
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Evidence Attachments</h4>
                {!submission || (submission.status !== "assessed" && submission.status !== "pending_review") && !isTimeUp && (
                   <div className="flex items-center gap-2">
                      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,video/*" />
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-brand-gold hover:text-white transition uppercase tracking-wider">
                         Add File
                      </button>
                   </div>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-navy-900 border border-navy-700 p-2 rounded-lg group">
                      <div className="shrink-0 text-brand-gold">{att.type.startsWith("image") ? <ImageIcon size={14}/> : <FileIcon size={14}/>}</div>
                      <span className="text-[10px] font-medium text-text-secondary truncate flex-1">{att.name}</span>
                      {!submission || (submission.status !== "assessed" && submission.status !== "pending_review") && !isTimeUp && (
                        <button onClick={() => removeAttachment(idx)} className="text-text-secondary hover:text-error transition"><X size={12}/></button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-navy-900/50 border border-dashed border-navy-700 rounded-xl text-center">
                   <p className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest">No evidence provided</p>
                </div>
              )}
            </div>

            {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review")) && (
              <button
                onClick={handleSubmit}
                disabled={submitting || (!content.trim() && attachments.length === 0) || isTimeUp}
                className="w-full bg-brand-gold text-navy-950 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-glow-gold hover:translate-y-[-1px] active:translate-y-[0px] transition-all disabled:opacity-50"
              >
                {submitting ? "Analyzing Neural Patterns..." : "Complete Mission Authority"}
              </button>
            )}
          </div>

          {/* AI Feedback Area */}
          <div className="card-premium p-6 md:p-8 space-y-6 bg-navy-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center border border-brand-gold/20 shadow-soft">
                  <Bot size={22} />
              </div>
              <h2 className="text-xl font-display font-bold text-text-primary tracking-tight">Intelligence Feedback</h2>
            </div>

            {submission?.status === "pending_review" || submission?.status === "assessed" ? (
              <div className="space-y-6">
                <div className="p-8 bg-navy-900 border border-navy-700 rounded-2xl text-center relative overflow-hidden shadow-soft">
                   {submission.status === "pending_review" && (
                     <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
                        <div className="flex flex-col items-center gap-2">
                           <Loader2 size={24} className="text-brand-gold animate-spin" />
                           <p className="text-[10px] font-bold text-brand-gold uppercase tracking-widest">Encrypting Review</p>
                        </div>
                     </div>
                   )}
                   <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 opacity-50">Operational Grade</div>
                   <div className={cn(
                     "text-6xl md:text-7xl font-display font-bold tracking-tighter",
                     submission.aiScore >= 80 ? "text-success" : submission.aiScore >= 50 ? "text-brand-gold" : "text-error"
                   )}>
                      {submission.aiScore}<span className="text-2xl text-text-secondary/30 ml-1">/100</span>
                   </div>
                </div>

                <div className="p-5 bg-navy-900 border border-navy-700 rounded-2xl relative overflow-hidden">
                   <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 opacity-50">Strategic Analysis</div>
                   <ExpandableText maxHeight={200}>
                      <div className="markdown-body text-sm text-text-secondary leading-relaxed font-medium italic">
                        <Markdown>{submission.aiFeedback || ""}</Markdown>
                      </div>
                   </ExpandableText>
                </div>

                <div className="flex flex-col gap-2">
                   {user?.inventory?.includes("reevaluation_pass") && (
                     <button onClick={handleReevaluate} className="w-full py-2 bg-navy-800 text-cyan-400 border border-cyan-500/10 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-navy-700 transition">
                        Neural Re-scan (Uses Pass)
                     </button>
                   )}
                   {(user?.inventory?.includes("resubmission_ticket") || user?.inventory?.includes("test_retake_pass")) && (
                     <button onClick={handleResubmit} className="w-full py-2 bg-navy-800 text-success border border-success/10 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-navy-700 transition">
                        Purge & Re-deploy (Uses Ticket)
                     </button>
                   )}
                </div>
              </div>
            ) : (
              <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center px-6 bg-navy-900/50 rounded-2xl border border-dashed border-navy-700">
                <div className="w-16 h-16 bg-navy-900 rounded-full flex items-center justify-center mb-6 text-text-secondary/20">
                  <Bot size={40} />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Awaiting Intelligence</h3>
                <p className="text-xs text-text-secondary max-w-xs leading-relaxed italic">
                  Analysis will trigger upon completion of mission directives. Premium neural patterns detected.
                </p>
              </div>
            )}
          </div>
        </div>
      )}


      {(user?.role === "admin" || user?.role === "superadmin") && (
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
                  <Bot className="w-4 h-4" /> AI Feedback Analysis
                </h4>
                <div className="markdown-body">
                  <Markdown>{inspectingSubmission.aiFeedback}</Markdown>
                </div>
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
};
