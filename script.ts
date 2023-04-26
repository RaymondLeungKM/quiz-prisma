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
    const { answers } = req.body;
    console.log(answers)
    try {
        // New logic: loop through each answer to get if they are correct or not.. but maybe we need to find a better way to send the answers from frontend
        // const resultArr = [];
        // answers.forEach(async (answer) => {
        //     if (answer == null) {
        //         resultArr.push({})
        //     }
        // })
        const answersArr = await prisma.answer.findMany({
            where: {
                id: {
                    in: answers
                }
            }
        })
        let correctCount = 0;
        const resultList: { id: number; isCorrect: boolean; }[] = [];
        answersArr.forEach((answer) => {
            if (answer.isCorrect) {
                correctCount += 1;
            }
            resultList.push({ id: answer.id, isCorrect: answer.isCorrect });
        })
        const result = {
            correctCount,
            score: correctCount/answers.length * 100,
            list: resultList
        };
        res.status(200).json(result);
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
