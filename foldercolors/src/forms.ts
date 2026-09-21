// Base Field class
export class Field {
    label: string;
    value: any;
    input: HTMLInputElement | null = null;

    constructor(label: string, value: any = '') {
        this.label = label;
        this.value = value;
    }

    buildRow(input: HTMLInputElement): HTMLDivElement {
        const labelElement = document.createElement('label');
        labelElement.className = 'fc-field-label';
        labelElement.innerText = this.label;

        const container = document.createElement('div');
        container.className = 'fc-field-row';
        container.appendChild(labelElement);
        container.appendChild(input);
        return container;
    }

    render(): HTMLElement {
        const input = document.createElement('input');
        this.input = input;

        input.value = this.value;

        // Update the value property when the input changes
        input.addEventListener('input', (event) => {
            this.value = (event.target as HTMLInputElement).value;
        });

        return this.buildRow(input);
    }
}

// TextField class
export class TextField extends Field {
    constructor(label: string, value: string = '') {
        super(label, value);
    }

    render(): HTMLElement {
        const container = super.render();
        if (this.input) {
            this.input.type = 'text';
            this.input.className = 'fc-text-input';
        }
        return container;
    }
}

// ColorField class
export class ColorField extends Field {
    constructor(label: string, value: string = '#000000') {
        super(label, value);
    }

    render(): HTMLElement {
        const container = super.render();
        if (this.input) {
            this.input.type = 'color';
            this.input.className = 'fc-color-input';
        }
        return container;
    }
}

export class FormModal {
    fields: Field[];
    modalId: string;
    onSubmit: (formData: { [key: string]: any }) => void;
    title: string;

    constructor(fields: Field[], modalId: string = 'formModal', title: string = '') {
        this.fields = fields;
        this.modalId = modalId;
        this.onSubmit = () => null; // Initialize with an empty function to avoid errors
        this.title = title;
    }

    handleSubmit(onSubmit: (formData: { [key: string]: any }) => void) {
        this.onSubmit = onSubmit;
    }

    render(): HTMLElement {
        const form = document.createElement('form');
        form.className = 'fc-form';

        const title = document.createElement('h1');
        title.className = 'fc-modal-title';
        title.innerText = this.title;
        form.appendChild(title);

        // Iterate over each field and append its rendered HTML to the form
        this.fields.forEach((field) => {
            form.appendChild(field.render());
        });

        // Create Submit and Cancel buttons
        const actions = document.createElement('div');
        actions.className = 'fc-modal-actions';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'fc-btn fc-btn-cancel';
        cancelButton.innerText = 'Cancel';
        cancelButton.addEventListener('click', () => this.close());

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.className = 'fc-btn fc-btn-submit';
        submitButton.innerText = 'Submit';

        actions.appendChild(cancelButton);
        actions.appendChild(submitButton);
        form.appendChild(actions);

        // Handle form submission
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData: { [key: string]: any } = {};

            // Collect values of all fields
            this.fields.forEach((field) => {
                formData[field.label] = field.value;
            });

            try {
                Promise.resolve(this.onSubmit(formData)).catch((error) => {
                    console.error('foldercolor: could not save color', error);
                });
            } catch (error) {
                console.error('foldercolor: could not save color', error);
            }

            // Close the modal after submission
            this.close();
        });

        // Create modal container
        const modalWrapper = document.createElement('div');
        modalWrapper.id = this.modalId;
        modalWrapper.className = 'fc-modal';
        modalWrapper.appendChild(form);

        // Overlay for closing modal
        const overlay = document.createElement('div');
        overlay.className = 'fc-modal-overlay';
        overlay.addEventListener('click', () => this.close());

        // Append modal and overlay to the body
        document.body.appendChild(overlay);
        document.body.appendChild(modalWrapper);

        return modalWrapper;
    }

    show() {
        const modal = this.render();
        if (modal) modal.style.display = 'block';
    }

    close() {
        const modal = document.getElementById(this.modalId);
        const overlay = document.querySelector('.fc-modal-overlay');
        if (modal) modal.remove();
        if (overlay) overlay.remove();
    }
}