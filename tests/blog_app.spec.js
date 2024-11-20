const { test, expect, beforeEach, describe } = require('@playwright/test')
const { loginWith, createBlog } = require('./helper')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('http://localhost:3001/api/testing/reset')
    await request.post('http://localhost:3001/api/users', {
      data: {
        name: 'Javier Test',
        username: 'javier-test',
        password: 'zombiethecranberries'
      }
    })

    await page.goto('http://localhost:5173')
  })

  test('Login form is shown', async ({ page }) => {
    const locator = await page.locator('.login-form')
    await expect(locator).toBeVisible()
  })

  describe('Login', () => {
    test('Succeeds with correct credentials', async ({ page }) => {
      await loginWith(page, 'javier-test', 'zombiethecranberries')
  
      await expect(page.getByText('Javier Test logged-in')).toBeVisible()
    })

    test('Fails with wrong credentials', async ({ page }) => {
      await loginWith(page, 'javier-test', 'wrong')
  
      await expect(page.getByText('wrong username or password')).toBeVisible()
    })
  })

  describe('When logged in', () => {
    beforeEach(async ({ page }) => {
      await loginWith(page, 'javier-test', 'zombiethecranberries')
    })

    test('A new blog can be created', async ({ page }) => {
      await createBlog(page, 'Blog test', 'Javier Test', 'blogtest.com')
      
      await expect(page.getByText('Blog test by Javier Test')).toBeVisible()
    })

    describe('and a blog exists', () => {
      beforeEach(async ({ page }) => {
        await createBlog(page, 'Blog test', 'Javier Test', 'blogtest.com')
      })
      
      test('A blog can be liked', async ({ page }) => {
        await page.getByRole('button', { name: 'View' }).click()
        await page.getByRole('button', { name: 'Like' }).click()
        
        await expect(page.locator('.likes', { hasText: '1' })).toBeVisible()
      })
      
      test('A blog can be deleted', async ({ page }) => {
        page.on('dialog', async dialog => {
          await dialog.accept()
        })
        
        await page.getByRole('button', { name: 'View' }).click()
        await page.getByRole('button', { name: 'Delete' }).click()
        
        await expect(page.getByText('"Blog test" by Javier Test has been deleted')).toBeVisible()
      })
      
      test('Ensures that only the user who created the blog sees the delete button', async ({ page }) => {
        await page.getByRole('button', { name: 'View' }).click()
        
        await expect(page.locator('.name', { hasText: 'Javier Test' })).toBeVisible
        await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible
      })
    })
    
    describe('and several blogs exist', () => {
      beforeEach(async ({ page }) => {
        await createBlog(page, 'Blog test 1', 'Javier Test', 'blogtest1.com')
        await createBlog(page, 'Blog test 2', 'Javier Test', 'blogtest2.com')
        await createBlog(page, 'Blog test 3', 'Javier Test', 'blogtest3.com')
      })

      test('Ensures that the blogs are arranged in the order according to the likes', async ({ page }) => {
        const blogs = await page.locator('.blog')
        const blogCount = await blogs.count()

        const likesPerBlog = [5, 3, 10]
        
        for (let i = 0; i < blogCount; i++) {
          const blog = await page.locator('.blog', { hasText: `Blog test ${i + 1}` })
          
          await blog.getByRole('button', { name: 'View' }).click()
          
          const likeButton = blog.getByRole('button', { name: 'Like' })

          for (let j = 0; j < likesPerBlog[i]; j++) {
            await likeButton.click()
            const likes = await blog.locator('.likes', { hasText: `${j + 1}` })
            await likes.waitFor()
          }
        }

        const likesArray = []

        for (let i = 0; i < blogCount; i++) {
            const blog = blogs.nth(i)

            const likesText = await blog.locator('.likes').innerText()
            const likes = parseInt(likesText, 10)

            likesArray.push(likes)
        }

        const sortedLikes = [...likesArray].sort((a, b) => b - a)
        expect(likesArray).toEqual(sortedLikes)
      })
    })
  })

})