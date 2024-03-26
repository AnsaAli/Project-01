
document.addEventListener('DOMContentLoaded', function () {
    const addCategoryForm = document.getElementById('addCategoryForm');
    const nameInput = document.getElementById('name');
    const nameError = document.getElementById('nameError');

    addCategoryForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const formData = new FormData(this);
        const response = await fetch("/admin/addCategory", {
            method: 'POST',
            body: formData
        });

        const data = await response.json()
        if (!response.ok) {
            if (data.errorMessage) {
                nameError.textContent = data.errorMessage
            }
        } else {
            // clear the error message if the request is successful
            nameError.textContent = ''
            const successMessage = document.getElementById('successMessage');
            successMessage.style.display = 'block';
        }
    })
})

console.log('inside the category message')