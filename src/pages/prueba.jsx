import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket";

export default function HostGame() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const quizData = location.state?.quizData;
  const players = location.state?.players || [];

  // ESTADO DEL JUEGO
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null); 
  const [isShowingResult, setIsShowingResult] = useState(false);
  const [answersCount, setAnswersCount] = useState(0);
  
  // CONTADOR INICIAL (3..2..1)
  const [startCountdown, setStartCountdown] = useState(3);

  // --- ARREGLO 1: LEEMOS LA PREGUNTA ACTUAL DIRECTAMENTE DEL ARRAY ---
  // Usamos una variable derivada, no un estado, para asegurar que siempre sea la fresca
  const questionsList = quizData?.questions || quizData?.questionsData || [];
const currentQ = questionsList[currentQuestionIndex];

  useEffect(() => {
    if (!quizData || !currentQ) {
      console.error("No hay datos de quiz o se acabó el array");
      // Si no hay datos, mejor regresamos para evitar pantallas blancas
      // navigate("/host"); 
    }
  }, [quizData, currentQ, navigate]);

  // 1. CUENTA REGRESIVA INICIAL (3..2..1)
  useEffect(() => {
    if (startCountdown > 0) {
      const timer = setTimeout(() => setStartCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [startCountdown]);

  // 2. LOGICA DE PREGUNTA NUEVA
  useEffect(() => {
    // Si estamos en cuenta regresiva o no hay pregunta, no hacemos nada
    if (startCountdown > 0 || !currentQ) return;

    console.log(`📡 Enviando Pregunta ${currentQuestionIndex + 1}:`, currentQ.question);

    // RESET DE ESTADOS PARA LA NUEVA PREGUNTA
    setIsShowingResult(false);
    setAnswersCount(0);
    setTimeLeft(currentQ.time || 20); // ARREGLO 3: Leemos el tiempo de ESTA pregunta

    // ENVIAR AL SERVIDOR
    socket.emit("send_question", {
      roomCode,
      question: currentQ, // Enviamos el objeto completo actualizado
      time: currentQ.time || 20
    });

    const onPlayerAnswered = () => {
      setAnswersCount((prev) => prev + 1);
    };

    socket.on("player_answered", onPlayerAnswered);

    return () => {
      socket.off("player_answered", onPlayerAnswered);
    };
  }, [currentQuestionIndex, startCountdown, roomCode]); // Quitamos 'currentQ' de dependencias para evitar bucles, usamos el index

  // 3. TEMPORIZADOR DE LA PREGUNTA
  useEffect(() => {
    if (timeLeft === null) return; 

    if (timeLeft > 0 && !isShowingResult) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isShowingResult) {
      setIsShowingResult(true);
    }
  }, [timeLeft, isShowingResult]);

  // --- ARREGLO 2: FUNCIÓN PARA AVANZAR ---
  const handleNext = () => {
    // Verificamos si hay más preguntas
    if (currentQuestionIndex < (quizData.questionsData.length - 1)) {
      console.log("➡️ Avanzando a la siguiente pregunta...");
      
      // 1. Ponemos tiempo en null para detener lógica vieja
      setTimeLeft(null);
      // 2. Quitamos resultados
      setIsShowingResult(false);
      // 3. Reseteamos respuestas
      setAnswersCount(0);
      // 4. FINALMENTE, subimos el índice
      setCurrentQuestionIndex(prev => prev + 1);
      
      // Opcional: Si quieres el conteo 3..2..1 entre cada pregunta, descomenta esto:
      // setStartCountdown(3); 
    } else {
      console.log("🏁 Fin del juego, yendo al podio");
      navigate(`/podium/${roomCode}`, { state: { quizData, players } });
    }
  };

  if (!currentQ) return <div style={{color:"white", textAlign:"center", marginTop: 50}}>Cargando pregunta...</div>;

  // --- VISTA: CUENTA REGRESIVA 3..2..1 ---
  if (startCountdown > 0) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#5A0E24", color: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "'Poppins', sans-serif" }}>
        <h2 style={{ fontSize: "2rem", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "5px" }}>¿Listos?</h2>
        <div key={startCountdown} style={{ fontSize: "10rem", fontWeight: "900", animation: "zoomIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
          {startCountdown}
        </div>
        <style>{`@keyframes zoomIn { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  // --- VISTA: JUEGO ---
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0f0f0", color: "#5A0E24", fontFamily: "Poppins, Montserrat", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "20px 40px", alignItems: "center" }}>
        
        {/* ARREGLO 2: El contador usa el índice + 1 */}
        <div style={{ background: "white", color: "#f0f0f0", padding: "10px 20px", borderRadius: "20px", fontWeight: "bold" }}>
          {currentQuestionIndex + 1} / {quizData.questionsData.length}
        </div>

        {/* ARREGLO 3: Los puntos vienen de currentQ */}
        <div style={{ background: "rgba(0,0,0,0.3)", padding: "5px 15px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: "bold", textTransform: "uppercase" }}>
          {currentQ.points || 100} Puntos
        </div>

        <h2 style={{ fontSize: "1.8rem", textAlign: "center", maxWidth: "60%" }}>{currentQ.question}</h2>
        
        <div style={{ background: (timeLeft || 0) < 5 ? "#FF1744" : "#574964", border: "2px solid white", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#f0f0f0", fontSize: "1.5rem", fontWeight: "bold" }}>
          {timeLeft === null ? "..." : timeLeft}
        </div>
      </div>

      {/* ÁREA CENTRAL */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{answersCount}</div>
          <div style={{ fontSize: "0.8rem" }}>Respuestas</div>
        </div>

        {isShowingResult && (
          <button 
            onClick={handleNext}
            style={{ padding: "15px 40px", fontSize: "1.2rem", fontWeight: "bold", background: "white", color: "#574964", border: "none", borderRadius: "10px", cursor: "pointer", boxShadow: "0 5px 15px rgba(0,0,0,0.2)", zIndex: 10, animation: "popIn 0.3s ease" }}
          >
            Siguiente
          </button>
        )}
      </div>

      {/* OPCIONES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", padding: "20px", height: "300px" }}>
        {/* ARREGLO 1: Usamos currentQ.options para asegurar que sean las de ESTA pregunta */}
        {currentQ.options.map((opt, i) => {
          const colors = ["#B77466", "#851535", "#9195F6", "#574964"];
          const icons = ["▲", "◆", "●", "■"];
          
          let isCorrect = false;
          if (Array.isArray(currentQ.answer)) {
            isCorrect = currentQ.answer.includes(opt);
          } else {
            isCorrect = currentQ.answer === opt;
          }

          const opacity = isShowingResult && !isCorrect ? 0.3 : 1;

          return (
            <div key={i} style={{ backgroundColor: colors[i % 4], opacity: opacity, borderRadius: "5px", display: "flex", alignItems: "center", padding: "0 30px", fontSize: "1.5rem", fontWeight: "600", color: "#FFFFFF", boxShadow: "0 4px 0 rgba(0,0,0,0.2)", transition: "opacity 0.3s" }}>
              <span style={{ marginRight: "15px", fontSize: "1.8rem" }}>{icons[i % 4]}</span>
              {opt}
              {isShowingResult && isCorrect && <span style={{ marginLeft: "auto", fontSize: "2rem" }}>✅</span>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
    </div>
  );
}