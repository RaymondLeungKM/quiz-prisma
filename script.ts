import express from 'express';
const cors = require('cors')
import { Request, Response } from 'express';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get('', (req: Request, res: Response) => {
    res.status(200).send("Welcome to the Quiz App Server!");
})

app.get('/quiz', async (req: Request, res: Response) => {
    const quizzes = await prisma.quiz.findMany({})
    res.status(200).json(quizzes);
})

app.get('/quiz/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const quiz = await prisma.quiz.findFirst({
            where: {
                id: {
                    equals: +id
                }
            },
            include: {
                questions: {
                    include: {
                        answers: {
                            select: {
                                id: true,
                                content: true,
                                order: true,
                                questionId: true
                            }
                        }
                    }
                }
            }
        })
        res.status(200).json(quiz);
    } catch (error) {
        console.log(error)
        res.status(500).send("Internal Server Error!");
    }
})

app.post('/checkAnswers', async (req: Request, res: Response) => {
    const { id, answers } = req.body;
    console.log(answers)
    try {
        const quiz = await prisma.quiz.findFirst({
            where: {
                id: {
                    equals: +id
                }
            },
            include: {
                questions: {
                    include: {
                        answers: true
                    }
                }
            }
        })
        const resultsArr: boolean[] = [];
        let correctCount = 0;
        answers.forEach((answer: number | null, index: number) => {
            if (answer === null) {
                resultsArr.push(false);
            } else {
                const matchedAns = quiz!.questions[index].answers.find((ans) => ans.id == +answer)!;
                if (matchedAns.isCorrect) {
                    resultsArr.push(true);
                    correctCount += 1;
                } else {
                    resultsArr.push(false);
                }
            }
        })
        res.status(200).json({
            correctCount,
            score: correctCount/answers.length * 100,
            list: resultsArr
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error!");
    }
})

const server = app.listen(3000, () => {
    console.log("Quiz Server started!");
});

// async function main() {
//     const Quiz = await prisma.quiz.findFirst({
//         where: {
//             id: {
//                 equals: 1
//             }
//         },
//         include: {
//             questions: {
//                 include: {
//                     answers: true
//                 }
//             }
//         }
//     })
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
