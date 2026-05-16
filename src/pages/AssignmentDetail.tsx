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
        className="flex items-center gap-1 md:gap-2 text-brand-gold hover:text-indigo-700 transition text-sm font-bold bg-brand-gold-secondary-hover hover:bg-brand-gold-secondary-hover w-fit px-3 py-2 md:px-4 md:py-2 rounded-xl mb-2 md:mb-0"
      >
        <ArrowLeft className="w-4 h-4" />{" "}
        <span className="hidden sm:inline">Back to Missions</span>
        <span className="sm:hidden">Back</span>
      </button>

      {/* Assignment Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className={cn(
          "rounded-3xl md:rounded-[2rem] p-6 md:p-12 border shadow-sm relative overflow-hidden",
          assignment.isBonus
            ? "bg-brand-gold/20 border-brand-gold/40 ring-4 ring-amber-100/50 shadow-amber-200 w-full"
            : "bg-bg-surface border-border-main",
        )}
      >
        {assignment.isBonus && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200/50 via-amber-100 to-amber-200/50 animate-pulse mix-blend-overlay"></div>
            <div className="absolute -right-8 -top-8 md:-right-12 md:-top-12 opacity-10">
              <Sparkles className="w-48 h-48 md:w-64 md:h-64" />
            </div>
          </>
        )}

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6 md:gap-8">
          <div className="w-full max-w-3xl">
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <div className="mb-4">
                 <button 
                  onClick={() => navigate('/assignments', { state: { editId: assignment.id } })}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-gold-hover text-bg-main rounded-xl hover:bg-indigo-700 transition shadow-lg font-black text-xs uppercase tracking-wider"
                 >
                   <Edit className="w-4 h-4" /> Edit Mission Template
                 </button>
              </div>
            )}
            {assignment.isBonus && (
              <span className="inline-block bg-bg-surface/90 text-brand-gold text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg mb-3 md:mb-4 uppercase tracking-widest shadow-sm">
                {assignment.isDuoBonus ? 'Special Duo Bonus Mission' : 'Special Bonus Mission'} • {assignment.bonusType === 'presentation' ? 'Presentation' : 'Test'} M{assignment.missionNumber || 1}
              </span>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-3xl md:text-6xl font-black mb-4 md:mb-6 tracking-tighter leading-tight",
                assignment.isBonus ? "text-amber-950" : "text-text-primary",
              )}
            >
              {assignment.title}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm font-bold mb-6 md:mb-8"
            >
              <span
                className={cn(
                  "py-2 px-3 md:px-4 rounded-xl flex items-center gap-1.5 md:gap-2",
                  assignment.isBonus
                    ? "bg-amber-500/20"
                    : "bg-border-main text-text-secondary",
                )}
              >
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> Due:{" "}
                {format(assignment.dueDate, "MMM d, p")}
              </span>
              <span
                className={cn(
                  "py-2 px-3 md:px-4 rounded-xl flex items-center gap-1.5 md:gap-2",
                  assignment.isBonus
                    ? "bg-bg-surface/20"
                    : "bg-brand-gold-secondary-hover text-indigo-700",
                )}
              >
                Entry: 🪙 {assignment.entryFee}
              </span>
              <span
                className={cn(
                  "py-2 px-3 md:px-4 rounded-xl flex items-center gap-1.5 md:gap-2",
                  assignment.isBonus
                    ? "bg-emerald-400/20 text-emerald-950"
                    : "bg-success-green/10 text-success-green",
                )}
              >
                Reward: 🪙 {assignment.bonusReward}
              </span>
              <span
                className={cn(
                  "py-2 px-3 md:px-4 rounded-xl flex items-center gap-1.5 md:gap-2",
                  assignment.isBonus
                    ? "bg-rose-400/20 text-rose-950"
                    : "bg-rose-500/10 text-rose-700",
                )}
              >
                Penalty: 🪙 -{assignment.penaltyFee}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "prose max-w-none text-base md:text-lg leading-relaxed font-medium select-none",
                assignment.isBonus ? "text-amber-900/80" : "text-text-secondary",
              )}
            >
              <ExpandableText text={assignment.description} maxLength={300} />
            </motion.div>

            {assignment.rubric && assignment.rubric.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary mb-4">
                  Grading Rubric
                </h3>
                <div className="grid gap-3">
                  {assignment.rubric.map((r, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-4 bg-bg-main/50 border border-border-main rounded-xl p-4 select-none"
                    >
                      <div>
                        <div className="font-bold text-text-primary">{r.name}</div>
                        <div className="text-sm font-medium text-text-secondary mt-0.5">
                          {r.description}
                        </div>
                      </div>
                      <div className="text-xs font-black bg-brand-gold-secondary-hover text-indigo-700 px-3 py-1.5 rounded-lg">
                        {r.weight}% WEIGHT
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {user?.role === "student" && !enrollment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-bg-surface rounded-[2rem] p-10 text-center border border-border-main shadow-xl max-w-2xl mx-auto shadow-indigo-100/30"
        >
          <div className="w-20 h-20 bg-bg-main rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-text-secondary/80" />
          </div>
          <h3 className="text-2xl font-black mb-3 text-text-primary">
            Unlock this Mission
          </h3>
          <p className="text-text-secondary mb-8 font-medium max-w-md mx-auto text-lg leading-relaxed">
            Commit 🪙 {finalEntryFee} coins to participate. Succeed to
            earn 🪙 {finalBonusReward} bonus reward. Failing to succeed will result in a 🪙 -{finalPenalty} Loss.
          </p>

          <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-3xl group transition-all hover:bg-white/10">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className={cn("p-3 rounded-2xl transition-colors", isDoubleDown ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-white/10 text-white/40")}>
                      <Zap size={24} className={isDoubleDown ? "animate-pulse" : ""} />
                   </div>
                   <div className="text-left">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Double Down</h4>
                      <p className="text-[10px] text-white/50 font-bold uppercase">2x Stake | 2.5x Reward | 2x Penalty</p>
                   </div>
                </div>
                <button 
                  onClick={() => setIsDoubleDown(!isDoubleDown)}
                  className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-300",
                    isDoubleDown ? "bg-rose-500" : "bg-white/20"
                  )}
                >
                  <motion.div 
                    animate={{ x: isDoubleDown ? 24 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                  />
                </button>
             </div>
          </div>

          {hasNotStarted ? (
            <div className="bg-brand-gold/10 text-brand-gold font-bold p-6 rounded-2xl flex items-center justify-center gap-3 border border-amber-100">
              <Clock className="w-6 h-6 animate-pulse" />
              Mission unlocks on {format(assignment.startDate!, "PPp")}
            </div>
          ) : isSubmissionLate ? (
            <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-center space-y-4">
              <p className="text-rose-600 font-bold">
                This mission is past its deadline.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnroll}
                disabled={
                  enrolling ||
                  user.coins <
                    assignment.entryFee +
                      (user.inventory?.includes("late_pass_1") ? 0 : 30)
                }
                className="bg-brand-gold-hover hover:bg-indigo-700 disabled:opacity-50 text-bg-main font-black text-lg py-4 px-8 rounded-2xl transition w-full shadow-lg"
              >
                {enrolling
                  ? "Unlocking..."
                  : user.inventory?.includes("late_pass_1")
                    ? `Pay 🪙 ${assignment.entryFee} (Uses 1 Late Pass)`
                    : `Pay 🪙 ${assignment.entryFee + 30} to Enroll Late`}
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEnroll}
              disabled={enrolling || user.coins < assignment.entryFee}
              className="bg-brand-gold-hover hover:bg-indigo-700 disabled:opacity-50 text-bg-main font-black text-lg py-5 px-8 rounded-2xl transition w-full shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-200"
            >
              {enrolling
                ? "Securing Stakes..."
                : `Commit 🪙 ${assignment.entryFee} Stakes & Begin`}
            </motion.button>
          )}
          {user.coins <
            (hasNotStarted
              ? assignment.entryFee
              : isSubmissionLate
                ? assignment.entryFee +
                  (user.inventory?.includes("late_pass_1") ? 0 : 30)
                : assignment.entryFee) && (
            <p className="text-rose-500 text-sm mt-4 font-bold flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Insufficient funds.{" "}
              <button
                onClick={() => navigate("/wallet")}
                className="underline decoration-rose-300 underline-offset-2"
              >
                Recharge Wallet
              </button>
            </p>
          )}
        </motion.div>
      )}

      {user?.role === "student" && enrollment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-bg-surface rounded-[2rem] overflow-hidden border border-border-main shadow-sm flex flex-col lg:flex-row mt-8"
        >
          {/* Editor Area */}
          <div className="flex-1 p-8 md:p-10 flex flex-col lg:border-r border-border-main">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-text-primary flex items-center gap-2">
                  <FileText className="w-6 h-6 text-brand-gold" />
                  Your Assessment
                </h2>
                {timeLeftStr && (
                  <span className="text-sm font-bold text-rose-600 bg-rose-500/10 rounded-xl px-3 py-1.5 inline-flex items-center gap-2 w-fit border border-rose-500/20">
                    <Clock className="w-4 h-4" /> Time Remaining:{" "}
                    <span className="font-mono text-base">{timeLeftStr}</span>
                  </span>
                )}
              </div>
              {isSubmissionLate && submission?.status !== "assessed" && (
                <span className="bg-rose-500/20 text-rose-800 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl">
                  LATE
                </span>
              )}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => {
                if (submission?.status !== "assessed" && submission?.status !== "pending_review" && !isTimeUp) {
                  e.preventDefault();
                  setPasteCount(prev => prev + 1);
                }
              }}
              onCopy={(e) => {
                  e.preventDefault();
                  toast.error("Copying is blocked during assessments.", { icon: '⚠️' });
              }}
              onContextMenu={(e) => {
                 if (submission?.status !== "assessed" && submission?.status !== "pending_review" && !isTimeUp) {
                    e.preventDefault();
                    toast.error("Context menu is disabled during assessments.", { icon: '⚠️' });
                 }
              }}
              disabled={
                submitting || submission?.status === "assessed" || submission?.status === "pending_review" || isTimeUp
              }
              className="flex-1 min-h-[300px] w-full p-6 text-lg border-2 border-border-main rounded-2xl resize-none outline-none focus:border-black focus:ring-4 focus:ring-gray-100 transition-all mb-6 bg-bg-main/50 disabled:bg-border-main disabled:text-text-secondary disabled:border-transparent font-medium shadow-inner"
              placeholder={
                isTimeUp
                  ? "Time is up! You can no longer modify your answer."
                  : "Construct your response here..."
              }
            />

            {/* Attachments UI */}
            <div className="mb-8">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-text-primary">
                    Supporting Materials
                  </h3>
                  {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review")) &&
                    !isTimeUp && (
                      <>
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*,application/pdf,video/*"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 text-sm font-bold text-brand-gold bg-brand-gold-secondary-hover px-4 py-2 rounded-xl hover:bg-brand-gold-secondary-hover transition border border-brand-gold/20"
                        >
                          <Paperclip className="w-4 h-4" /> Upload
                        </button>
                      </>
                    )}
                </div>
                {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review")) && !isTimeUp && (
                  <p className="text-[11px] text-text-secondary/80 font-bold uppercase tracking-tight flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="bg-border-main px-2.5 py-1 rounded-lg text-text-secondary border border-border-main/50">
                      Limits: 5MB Images / 500KB Others
                    </span>
                    <a 
                      href="https://www.samjuniors.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-brand-gold hover:text-indigo-700 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-500 transition-all font-black"
                    >
                      Use our compressor if files are too large →
                    </a>
                  </p>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="flex gap-3 flex-wrap">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-bg-surface border border-border-main shadow-sm rounded-xl p-2 pr-4 max-w-[200px] group transition-all hover:border-brand-gold/30"
                    >
                      <div className="w-8 h-8 rounded-lg bg-bg-main flex items-center justify-center shrink-0">
                        {att.type.startsWith("image") ? (
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                        ) : att.type.startsWith("video") ? (
                          <Video className="w-4 h-4 text-purple-500" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-text-secondary" />
                        )}
                      </div>
                      <span className="text-xs font-bold truncate text-text-secondary">
                        {att.name}
                      </span>
                      {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review")) &&
                        !isTimeUp && (
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="ml-auto flex shrink-0 items-center justify-center w-6 h-6 hover:bg-rose-500/10 rounded-md text-text-secondary/80 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-text-secondary/80 bg-bg-main/50 p-4 rounded-xl border border-dashed border-border-main inline-block">
                  No files attached
                </p>
              )}
            </div>

            {(!submission || (submission.status !== "assessed" && submission.status !== "pending_review")) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={
                  submitting || (!content.trim() && attachments.length === 0)
                }
                className="w-full bg-text-primary hover:bg-text-primary hover:text-bg-main text-bg-main py-5 px-6 rounded-2xl font-black text-lg transition flex justify-center items-center gap-3 disabled:opacity-50 shadow-sm"
              >
                {submitting
                  ? "Transmitting to AI..."
                  : isTimeUp
                    ? "Submit Answer (Time Up)"
                    : isSubmissionLate
                      ? user?.inventory?.includes("late_pass_1")
                        ? "Submit Late (Uses 1 Late Pass)"
                        : "Submit Late (🪙 30 Fee)"
                      : "Submit Mission"}
                {!submitting && <Send className="w-5 h-5" />}
              </motion.button>
            )}
          </div>

          {/* AI Feedback Area */}
          <div className="flex-1 p-8 md:p-10 bg-bg-main/30">
            <h2 className="text-2xl font-black text-text-primary mb-6 flex items-center gap-2">
              <span className="w-10 h-10 bg-success-green/20 rounded-xl flex items-center justify-center text-emerald-600">
                <Bot className="w-6 h-6" />
              </span>
              AI Evaluator
            </h2>
            {submission?.status === "assessed" || submission?.status === "pending_review" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {submission.status === "pending_review" && (
                  <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                    <p className="text-sm font-bold text-amber-800">
                      Processing Analysis... This submission is being reviewed by a Super Admin for final points allocation.
                    </p>
                  </div>
                )}
                <div className="bg-bg-surface p-8 rounded-3xl border border-border-main shadow-xl shadow-emerald-100/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
                  <div className="text-sm font-black text-text-secondary/80 uppercase tracking-widest mb-4 mt-2">
                    Evaluation Score
                  </div>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className={cn(
                      "text-7xl font-black mb-4 tracking-tighter",
                      submission.status === "pending_review" 
                        ? "text-text-secondary/60 blur-md select-none" 
                        : submission.aiScore >= 80
                          ? "text-emerald-500"
                          : submission.aiScore >= 50
                            ? "text-amber-500"
                            : "text-rose-500",
                    )}
                  >
                    {submission.status === "pending_review" ? "??" : submission.aiScore}
                    <span className="text-3xl text-text-secondary/60">/100</span>
                  </motion.div>

                  {((submission.tabSwitches && submission.tabSwitches > 0) || (submission.pasteCount && submission.pasteCount > 0)) && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mt-4 text-left flex gap-3 text-sm">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-800 mb-1">Activity Tracking Flags</p>
                        <ul className="list-disc leading-relaxed text-rose-700 ml-4">
                          {submission.tabSwitches && submission.tabSwitches > 0 && <li>Tab switched {submission.tabSwitches} times during assessment.</li>}
                          {submission.pasteCount && submission.pasteCount > 0 && <li>Copy-pasted content {submission.pasteCount} times.</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  {submission.status === "assessed" ? (
                    submission.aiScore >= 50 && !isSubmissionLate ? (
                      <div className="bg-success-green/10 text-success-green text-sm font-bold py-3 rounded-xl inline-flex items-center gap-2 px-6 border border-success-green/20">
                        <span>Reward Unlocked: 🪙 {Math.floor(assignment.bonusReward * (submission.aiScore >= 90 ? 1.0 : (submission.aiScore >= 75 ? 0.8 : 0.5)))}</span>
                      </div>
                    ) : submission.aiScore >= 50 && isSubmissionLate ? (
                      <div className="bg-rose-500/10 text-rose-700 text-sm font-bold py-3 rounded-xl inline-flex items-center gap-2 px-6 border border-rose-500/20">
                        <span>No bonus coins awarded for Late Submissions</span>
                      </div>
                    ) : (
                      <div className="bg-rose-500/10 text-rose-700 text-sm font-bold py-3 rounded-xl inline-flex items-center gap-2 px-6 border border-rose-500/20">
                        Minimum threshold not met
                      </div>
                    )
                  ) : (
                    <div className="bg-brand-gold-secondary-hover text-indigo-700 text-sm font-bold py-3 rounded-xl inline-flex items-center gap-2 px-6 border border-brand-gold/20">
                      Rewards pending manual approval
                    </div>
                  )}
                </div>
                <div className="bg-bg-surface p-8 rounded-3xl border border-border-main shadow-sm relative overflow-hidden">
                  {submission.status === "pending_review" && (
                    <div className="absolute inset-0 bg-bg-surface/60 backdrop-blur-sm z-10 flex items-center justify-center p-6 text-center">
                       <div className="bg-bg-surface shadow-xl border border-border-main p-6 rounded-3xl max-w-xs">
                          <Bot className="w-10 h-10 text-brand-gold mx-auto mb-3" />
                          <p className="text-sm font-bold text-text-secondary leading-relaxed italic">
                            AI analysis is complete but awaiting Super Admin verification before revealing feedback and marks.
                          </p>
                       </div>
                    </div>
                  )}
                  <div className="text-sm font-black text-text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Feedback Analysis
                  </div>
                  <ExpandableText maxHeight={200}>
                    <div className="markdown-body">
                      <Markdown>{submission.aiFeedback}</Markdown>
                    </div>
                  </ExpandableText>
                </div>

                {/* Shop Interaction area */}
                <div className="flex flex-col gap-3 mt-6">
                  {user?.inventory?.includes("reevaluation_pass") && (
                    <button
                      onClick={handleReevaluate}
                      disabled={submitting}
                      className="w-full bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-200 py-3 rounded-2xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-5 h-5" /> Re-evaluate with AI (Uses 1
                      Pass)
                    </button>
                  )}
                  {(user?.inventory?.includes("resubmission_ticket") ||
                    user?.inventory?.includes("test_retake_pass")) && (
                    <button
                      onClick={handleResubmit}
                      disabled={submitting}
                      className="w-full bg-success-green/20 hover:bg-emerald-200 text-emerald-900 border border-success-green/30 py-3 rounded-2xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" /> Clear & Resubmit (Uses 1{" "}
                      {user?.inventory?.includes("resubmission_ticket")
                        ? "Resubmission Ticket"
                        : "Test Retake Pass"}
                      )
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-border-main rounded-3xl flex flex-col items-center justify-center text-text-secondary/80 p-10 text-center bg-bg-surface/50">
                <div className="w-24 h-24 bg-border-main rounded-full flex items-center justify-center mb-6">
                  <Bot className="w-12 h-12 text-text-secondary/60" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Awaiting Submission
                </h3>
                <p className="font-medium text-text-secondary max-w-sm leading-relaxed mb-6">
                  Complete your mission to receive an instant, detailed analysis
                  from our AI.
                </p>

                {user?.inventory?.includes("practical_pass") && !isTimeUp && (
                  <button
                    onClick={handlePracticalExemption}
                    disabled={submitting}
                    className="bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-900 border border-fuchsia-200 py-3 px-6 rounded-2xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-5 h-5" /> Use Practical Pass
                    (Auto-Score 80/100)
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
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
